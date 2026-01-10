export type ValidateCaptcha = {
  code: number;
  data: DataData;
  message: string;
  ttl: number;
  [property: string]: any;
}

type DataData = {
  grisk_id: string;
  is_valid: number;
  [property: string]: any;
}
