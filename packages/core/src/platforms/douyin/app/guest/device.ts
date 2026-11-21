import { randomBytes, randomInt, randomUUID } from 'node:crypto'

export interface AppDevice {
  device_id: string
  install_id: string
  openudid: string
  cdid: string
  clientudid: string
  x_tt_dt: string
  user_agent: string
  profile: Record<string, string>
}

/** 在 amagi 端只生成一次，注册、JNI、UA 和业务请求复用同一份数据。 */
export const createAppDevice = (): AppDevice => {
  const now = Date.now()
  const suffix = randomBytes(4).toString('hex')
  const model = `AM${randomInt(100000, 999999)}`
  const brand = `am${suffix.slice(0, 4)}`
  const device = `d${suffix}`
  const build = 'UP1A.231005.007'
  const installed = now - 86400000
  const profile: Record<string, string> = {
    profile_source: 'amagi-v1',
    device_type: model,
    device_brand: brand,
    device_manufacturer: brand,
    device,
    product: `${device}_cn`,
    board: 'sm8450',
    hardware: 'qcom',
    serial: randomBytes(8).toString('hex').toUpperCase(),
    os_api: '34',
    os_version: '14',
    build_id: build,
    rom: '231005007',
    rom_version: `${device}_cn-user 14 ${build} 231005007 release-keys`,
    build_fingerprint: `${brand}/${device}_cn/${device}:14/${build}/231005007:user/release-keys`,
    build_type: 'user',
    build_tags: 'release-keys',
    build_host: `h${suffix}`,
    build_user: `u${suffix}`,
    bootloader: `${model}_${suffix}`,
    radio: 'MPSS.343433.509',
    security_patch: '2023-10-05',
    resolution: '1080*2400',
    dpi: '480',
    language: 'zh',
    tz_name: 'Asia/Shanghai',
    tz_offset: '28800',
    ac: 'wifi',
    channel: 'aweGW',
    host_abi: 'arm64-v8a',
    uid: String(randomInt(10000, 50000)),
    process_id: String(randomInt(1000, 30000)),
    cpu_count: '8',
    memory_bytes: '8589934592',
    apk_first_install_time: String(installed),
    first_launch_timestamp: String(Math.floor(installed / 1000))
  }
  return {
    device_id: '',
    install_id: '',
    openudid: randomBytes(8).toString('hex'),
    cdid: randomUUID(),
    clientudid: randomUUID(),
    x_tt_dt: '',
    user_agent: `com.ss.android.ugc.aweme/400700 (Linux; Android 14; zh; ${model}; Build/${build})`,
    profile
  }
}

export const completeAppUrl = (input: string, device: AppDevice): string => {
  const url = new URL(input)
  const p = device.profile
  const common: Record<string, string> = {
    iid: device.install_id,
    device_id: device.device_id,
    openudid: device.openudid,
    cdid: device.cdid,
    ac: p.ac,
    channel: p.channel,
    aid: '1128',
    app_name: 'aweme',
    version_code: '400700',
    version_name: '40.7.0',
    device_platform: 'android',
    os: 'android',
    device_type: p.device_type,
    device_brand: p.device_brand,
    language: p.language,
    os_api: p.os_api,
    os_version: p.os_version,
    manifest_version_code: '400701',
    resolution: p.resolution,
    dpi: p.dpi,
    update_version_code: '40709900',
    _rticket: String(Date.now()),
    package: 'com.ss.android.ugc.aweme',
    first_launch_timestamp: p.first_launch_timestamp,
    cpu_support64: 'true',
    host_abi: p.host_abi,
    is_guest_mode: '0',
    app_type: 'normal',
    minor_status: '0',
    is_preinstall: '0',
    need_personal_recommend: '1',
    is_android_pad: '0',
    is_android_fold: '0',
    ts: String(Math.floor(Date.now() / 1000))
  }
  for (const [key, value] of Object.entries(common)) url.searchParams.set(key, value)
  return url.toString()
}

export const registrationBody = (device: AppDevice) => {
  const p = device.profile
  const [width, height] = p.resolution.split('*')
  return {
    magic_tag: 'ss_app_log',
    _gen_time: Date.now(),
    header: {
      display_name: '抖音',
      aid: 1128,
      package: 'com.ss.android.ugc.aweme',
      app_version: '40.7.0',
      version_code: 400700,
      manifest_version_code: 400701,
      channel: p.channel,
      sdk_version: '3.7.3-rc.118-douyin',
      sdk_flavor: 'china',
      os: 'Android',
      os_api: Number(p.os_api),
      os_version: p.os_version,
      device_model: p.device_type,
      device_brand: p.device_brand,
      device_manufacturer: p.device_manufacturer,
      device_category: 'phone',
      cpu_abi: p.host_abi,
      density_dpi: Number(p.dpi),
      display_density: 'xxhdpi',
      resolution: `${height}x${width}`,
      language: p.language,
      timezone: 8,
      tz_name: p.tz_name,
      tz_offset: Number(p.tz_offset),
      access: p.ac,
      rom: p.rom,
      rom_version: p.rom_version,
      ipv6_list: [],
      sim_serial_number: [],
      oaid_may_support: false,
      multi_app: { va_path: '/data/user/0/com.ss.android.ugc.aweme', mu: Number(p.uid), symlink: 0 },
      custom: { is_android_fold: 0, is_android_pad: 0 },
      apk_first_install_time: Number(p.apk_first_install_time),
      is_system_app: 0,
      guest_mode: 0,
      openudid: device.openudid,
      cdid: device.cdid,
      clientudid: device.clientudid,
      user_agent: device.user_agent,
      req_id: randomUUID()
    }
  }
}
