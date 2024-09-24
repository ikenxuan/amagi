
# amagi (What Are You Doing? Haha)

- Douyin and Bilibili web data interfaces based on Node.js, supporting Node.js version 18 and above.

![amagi](https://socialify.git.ci/ikenxuan/amagi/image?font=Source%20Code%20Pro&forks=1&issues=1&language=1&name=1&owner=1&pattern=Floating%20Cogs&pulls=1&stargazers=1&theme=Auto)

English、[中文](./README-ZH.md)、[日本語](./README-JP.md)
## Usage
```
pnpm add @ikenxuan/amagi
```

## Quick Start

**_Retrieve data directly_**
```js
import { getDouyinData, getBilibiliData } from '@ikenxuan/amagi';

const douyinck = 'Your Douyin CK';
const bilibilick = 'Your Bilibili CK';

const Douyin = await getDouyinData('单个视频作品数据', douyinck, { url: 'https://v.douyin.com/irHntHL7' });

const Bilibili = await getBilibiliData('单个视频作品数据', bilibilick, { url: 'https://b23.tv/9JvEHhJ' });
```

- For the first parameter, see [**API Data Type Enum**](./src/types/DataType.ts)
- For parameters of the passed object, refer to [**Douyin API Request Parameters**](./src/types/DouyinAPIParams.ts), [**Bilibili API Request Parameters**](./src/types/BilibiliAPIParams.ts), or the [**API Documentation**](https://amagi.apifox.cn)

---

**_Deploy a server locally_**

- API Documentation: [**Apifox**](https://amagi.apifox.cn)
```js
import amagi, { startClient } from '@ikenxuan/amagi';

const Client = await new amagi({
  douyin: 'Douyin CK',
  bilibili: 'Bilibili CK'
}).initServer(true); // Enable debug mode

// Start listening on port 4567, customizable
await startClient(Client.Instance, 4567);
```

## Development Build

> **For development, Node.js version 18 or higher is required**

- Install dependencies:
```
pnpm install
```

- Build:
```
pnpm build
```

## License
[GPL-3.0](https://github.com/ikenxuan/amagi/blob/main/LICENSE)

## Disclaimer
This library has no backdoor, and it does not upload any of your information to third parties. The configured CK is used only to request official API interfaces.

The project code is derived from [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) with modifications.

<h2>Without permission, the open-source code of this project is prohibited for any commercial purpose. The user bears all responsibility for any issues or consequences resulting from using this project. The developers of this project take no responsibility.</h2>
