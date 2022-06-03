const express = require("express");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const svgCaptcha = require("svg-captcha");
const session = require("express-session");
const cookoeParser = require("cookie-parser");
const CRC32 = require("crc-32");
const fsExtra = require("fs-extra");

const APIKEY = "你的apikey";
const APIURL = "你的面板连接";
const PORT = 3000;
const PASSWORD = "密码";
const DBFile = "./db.json";

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

if(!fsExtra.existsSync(DBFile)) {
  fsExtra.createFileSync(DBFile);
  fsExtra.writeJSONSync(DBFile, {});
}

const database = {
  add(username, password, timestamp, node, launchFile) {
    let DB = fsExtra.readJSONSync(DBFile);
    DB[username] = {
      password: password,
      timestamp: timestamp,
      node: node,
      launchFile: launchFile,
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
  req.session.mcsmreg_captcha = CRC32.str(captcha.text.toLowerCase());
  res.setHeader("Content-Type", "image/svg+xml");
  res.cookie("captcha", req.session);
  res.send(captcha.data);
});

//接口限速
const accountLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/register", accountLimiter);
app.use("/api/admin", accountLimiter);

//注册
app.post("/api/register", async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  var captcha = req.body.captcha.toLowerCase();

  //验证码检测
  console.log("验证码校验: ", CRC32.str(captcha), req.session.mcsmreg_captcha);
  if (CRC32.str(captcha) !== req.session.mcsmreg_captcha) {
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
    .post(APIURL + "/api/auth?apikey=" + APIKEY, data, {
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
      },
    })
    .catch((e) => {
      console.log(username, "创建失败", e.response.data.data);
      return res.json({
        status: 400,
        msg: `${e.code}: ${e.response.data.data}`,
      });
    });

  //返回成功
  if (resp.status == 200 && resp.data.status == 200) {
    database.add(username, password, Date.now(), -1, "none");
    return res.json({
      status: 200,
      msg: "账号创建成功",
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
