export type ApplyCaptcha = {
  code: number;
  data: DataData;
  message: string;
  ttl: number;
  [property: string]: any;
}

type DataData = {
  biliword: null;
  geetest: Geetest;
  phone: null;
  sms: null;
  sms_mo: null;
  token: string;
  type: string;
  [property: string]: any;
}

type Geetest = {
  challenge: string;
  gt: string;
  [property: string]: any;
}
