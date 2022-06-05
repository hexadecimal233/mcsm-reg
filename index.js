const express = require("express");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const svgCaptcha = require("svg-captcha");
const session = require("express-session");
const cookoeParser = require("cookie-parser");
const fsExtra = require("fs-extra");

const APIKEY = "";
const APIURL = "";
const PORT = 3000;
const PASSWORD = "";
const DBFile = "./db.json";
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(express.static("./static"));
app.use(cookoeParser());
app.use(
  session({
    secret: "mcsmreg",
    name: "SESS_MCSMREG",
    cookie: { maxAge: 120000 },
    resave: false,
    saveUninitialized: true,
  })
);

//数据库
if (!fsExtra.existsSync(DBFile)) {
  fsExtra.createFileSync(DBFile);
  fsExtra.writeJSONSync(DBFile, {});
}

const database = {
  add(username, password, timestamp) {
    let DB = fsExtra.readJSONSync(DBFile);
    DB[username] = {
      password: password,
      timestamp: timestamp,
    };
    fsExtra.writeJSONSync(DBFile, DB);
  },
  remove(username) {
    let DB = fsExtra.readJSONSync(DBFile);
    delete DB[username];
    fsExtra.writeJSONSync(DBFile, DB);
  },
  query() {
    let DB = fsExtra.readJSONSync(DBFile);
    return DB;
  },
};

//CORS设置
app.all("*", function (req, res, next) {
  res.set("Access-Control-Allow-Origin", "*");
  next();
});

//验证码模块
app.get("/api/captcha", (req, res) => {
  const colorMap = [
    "#eeeeee",
    "#edfedf",
    "#eeddff",
    "skyblue",
    "orange",
    "#c8c8c8",
  ];
  const randomColor = colorMap[Math.floor(Math.random() * colorMap.length)];
  var captcha = svgCaptcha.create({
    color: true,
    inverse: false,
    background: randomColor,
    width: 100,
    height: 40,
    fontSize: 36,
    size: 4,
    noise: 3,
    ignoreChars: "0oO1ilI",
  });
  req.session.mcsmreg_captcha = captcha.text.toLowerCase();
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(captcha.data);
});

//接口限速
const regLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
});

const adminApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/register", regLimiter);
app.use("/api/admin", adminApiLimiter);
app.use("/api/renew", adminApiLimiter);

//注册
app.post("/api/register", async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  var captcha0 = req.body.captcha;
  if (captcha0 == null) {
    return res.json({
      status: 400,
      msg: "验证码不能为空",
    });
  }
  var captcha = captcha0.toLowerCase();

  //验证码检测
  console.log("验证码校验: ", CRC32.str(captcha), req.session.mcsmreg_captcha);
  if (captcha !== req.session.mcsmreg_captcha) {
    delete req.session.mcsmreg_captcha;
    return res.json({
      status: 403,
      msg: "验证码错误或失效",
    });
  }

  delete req.session.mcsmreg_captcha;

  if (!username || !password)
    return res.json({
      status: 400,
      msg: "账号密码不能为空",
    });

  const data = {
    username: username,
    password: password,
    permission: 1,
  };

  //调用MCSM API
  console.log(username, "正在被创建");
  let resp = await axios
    .post(APIURL + "/api/auth", data, {
      timeout: 5000,
      headers: HEADERS,
      params: {
        apikey: APIKEY,
      },
    })
    .catch((e) => {
      console.log(username, "创建失败", e.response.data.data);
      return res.json({
        status: 400,
        msg: `${e.response.data.data}`,
      });
    });

  //返回成功
  if (resp.status == 200 && resp.data.status == 200) {
    console.log(username, password, Date.now());
    database.add(username, password, Date.now());
    return res.json({
      status: 200,
      msg: "账号创建成功",
    });
  }
});

//续期
app.post("/api/renew", async (req, res) => {
  var guid = req.body.guid;
  var uuid = req.body.uuid;

  if (!guid || !uuid)
    return res.json({
      status: 400,
      msg: "GUID/UUID不能为空",
    });

  const queryParams = {
    uuid: uuid,
    remote_uuid: guid,
    apikey: APIKEY,
  };

  //调用MCSM API
  console.log(guid, uuid, "续期");
  let respInst = await axios
    .get(APIURL + "/api/instance", {
      timeout: 5000,
      headers: HEADERS,
      params: queryParams,
    })
    .catch((e) => {
      console.log(guid, uuid, "实例获取错误");
      return res.json({
        status: 400,
        msg: "实例获取错误",
      });
    });

  if (respInst.status != 200 || respInst.data.status != 200) return;
  let inst = respInst.data.data.config;

  let origDate = new Date(inst.endTime);

  let time = new Date();
  let oldTime = time.getTime();
  time.setTime(oldTime + 1000 * 60 * 60 * 24 * 3);
  let canRenew = origDate.getTime() - oldTime <= 1000 * 60 * 60 * 24;
  inst.endTime = time.toLocaleDateString();

  if (!canRenew) {
    console.log(guid, uuid, "续期太快");
    return res.json({
      status: 400,
      msg: "再等等吧~",
    });
  }

  let resp2 = await axios
    .put(APIURL + "/api/instance", inst, {
      timeout: 5000,
      headers: HEADERS,
      params: queryParams,
    })
    .catch((e) => {
      console.log(guid, uuid, "续期失败");
      return res.json({
        status: 400,
        msg: "续期失败",
      });
    });

  if (resp2.status == 200 && resp2.data.status == 200) {
    console.log(guid, uuid, "续期成功 结束时间", inst.endTime);
    return res.json({
      status: 200,
      msg: "续期成功, 请等三天后再来!",
    });
  }
});

app.get("/api/admin/queryreg", (req, res) => {
  if (req.query.key == PASSWORD) {
    console.log("查询注册");
    return res.status(200).json(database.query());
  } else {
    return res.status(403).json({});
  }
});

app.get("/api/admin/deletereg", (req, res) => {
  if (req.query.key == PASSWORD && req.query.name) {
    console.log("删除注册", req.query.name);
    database.remove(req.query.name);
    return res.status(200).json({});
  } else {
    return res.status(403).json({});
  }
});

app.listen(PORT, () => {
  console.log(`服务器端口监听: ${PORT}`);
});

//404页面
app.get("*", function (req, res) {
  res.sendFile("./404.html", {
    root: __dirname + "/static",
    status: 404,
  });
});
