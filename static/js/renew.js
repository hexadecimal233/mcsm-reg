window.onload = function () {
  u_onload();
};

function renew() {
  var guid = document.getElementById("guid").value;
  var uuid = document.getElementById("uuid").value;

  console.log(guid, uuid);

  if (guid == "" || uuid == "") {
    renewFail("GUID/UUID不能为空");
    return;
  }

  document.getElementById("renew-btn").disabled = true;
  xhr = new XMLHttpRequest();
  xhr.open("POST", link + "/api/renew", true);
  xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  xhr.timeout = 5000;
  xhr.ontimeout = function (e) {
    renewFail("超时");
    document.getElementById("renew-btn").disabled = false;
  };
  xhr.onerror = function (e) {
    renewFail("未知错误");
    document.getElementById("renew-btn").disabled = false;
  };
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      if (xhr.getResponseHeader("Content-Type").includes("application/json")) {
        var result = JSON.parse(xhr.responseText);
        if (result.status == 200) {
          renewSuccess();
        } else {
          renewFail(result.msg);
        }
        console.log(result);
      } else {
        renewFail(xhr.status);
      }
      document.getElementById("renew-btn").disabled = false;
    }
  };
  var sendData = {
    guid: guid,
    uuid: uuid,
  };
  xhr.send(JSON.stringify(sendData));
}

function renewSuccess() {
  swal
    .fire("续期成功!", "你已续期成功! 你可继续使用.", "success")
    .then((result) => {
      if (result.isConfirmed) {
        window.location.reload();
      }
    });
}

function renewFail(reason) {
  swal.fire({
    icon: "error",
    title: "续期失败!",
    text: `错误原因: ${reason}.`,
    footer: "必要时可询问发给客服",
  });
}
