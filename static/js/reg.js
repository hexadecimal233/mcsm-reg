window.onload = function () {
  u_onload();
  getCaptcha();
};

function getCaptcha() {
  document.getElementById("captchaimg").src = "../api/captcha?t=" + Date.now();
}

function register() {
  var username = document.getElementById("username").value;
  var password = document.getElementById("password").value;
  var captcha = document.getElementById("captcha").value;

  console.log(username, password);

  if (username == "" || password == "") {
    regFail("用户名或密码不能为空");
    return;
  }

  if (captcha == "") {
    regFail("验证码为空");
    getCaptcha();
    return;
  }

  document.getElementById("login-btn").disabled = true;
  xhr = new XMLHttpRequest();
  xhr.open("POST", link + "/api/register", true);
  xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  xhr.timeout = 5000;
  xhr.ontimeout = function (e) {
    regFail("超时");
    document.getElementById("login-btn").disabled = false;
  };
  xhr.onerror = function (e) {
    regFail("未知错误");
    document.getElementById("login-btn").disabled = false;
  };
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      if (xhr.getResponseHeader("Content-Type").includes("application/json")) {
        var result = JSON.parse(xhr.responseText);
        if (result.status == 200) {
          regSuccess();
        } else {
          regFail(result.msg);
        }
        console.log(result);
      } else {
        regFail(xhr.status);
      }
      document.getElementById("login-btn").disabled = false;
      getCaptcha();
    }
  };
  var sendData = {
    username: username,
    password: password,
    captcha: captcha,
  };
  xhr.send(JSON.stringify(sendData));
}

function regSuccess() {
  swal
    .fire("注册成功!", "你已注册成功! 请等待管理员处理为你创建实例.", "success")
    .then((result) => {
      if (result.isConfirmed) {
        window.location = LOGIN_PAGE;
      }
    });
}

function regFail(reason) {
  swal.fire({
    icon: "error",
    title: "注册失败!",
    text: `错误原因: ${reason}.`,
    footer: "必要时可询问发给客服",
  });
}
