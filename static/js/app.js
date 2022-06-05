const organization = "";
const customer = "";
const link = "";
const LOGIN_PAGE = "";

function u_onload() {
  document.getElementById(
    "copyright"
  ).innerHTML = `&copy;Copyright 2022 ${organization}&trade;`;
  let regtitle = document.getElementById("regtitle");
  if (regtitle) regtitle.innerHTML = `${organization}注册`;
  let renewtitle = document.getElementById("renewtitle");
  if (renewtitle) renewtitle.innerHTML = `${organization}续期`;
  document.getElementById("subtitle").innerHTML = `${customer}`;
}
