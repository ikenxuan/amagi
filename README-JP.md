
# amagi (何してる？ははは)

- Douyin および Bilibili のウェブデータインターフェースは、Node.js をベースにしており、Node.js バージョン 16 以上をサポートしています。

![amagi](https://socialify.git.ci/ikenxuan/amagi/image?font=Source%20Code%20Pro&forks=1&issues=1&language=1&name=1&owner=1&pattern=Floating%20Cogs&pulls=1&stargazers=1&theme=Auto)

[English](./README.md)、[中文](./README-ZH.md)、日本語
## 使用方法
```
pnpm add @ikenxuan/amagi
```

## クイックスタート

**_データを直接取得_**
```js
import { getDouyinData, getBilibiliData } from '@ikenxuan/amagi';

const douyinck = 'あなたの Douyin CK';
const bilibilick = 'あなたの Bilibili CK';

const Douyin = await getDouyinData('单个视频作品数据', douyinck, { url: 'https://v.douyin.com/irHntHL7' });

const Bilibili = await getBilibiliData('单个视频作品数据', bilibilick, { url: 'https://b23.tv/9JvEHhJ' });
```

- 第1引数の詳細については [**API データタイプ列挙**](./src/types/DataType.ts) を参照してください。
- 渡されたオブジェクトのパラメータについては、[**Douyin API リクエストパラメータ**](./src/types/DouyinAPIParams.ts)、[**Bilibili API リクエストパラメータ**](./src/types/BilibiliAPIParams.ts) または [**API ドキュメント**](https://amagi.apifox.cn) を参照してください。

---

**_ローカルでサーバーをデプロイ_**

- API ドキュメント: [**Apifox**](https://amagi.apifox.cn)
```js
import amagi, { startClient } from '@ikenxuan/amagi';

const Client = await new amagi({
  douyin: 'Douyin CK',
  bilibili: 'Bilibili CK'
}).initServer(true); // デバッグモードを有効にするかどうか

// ポート4567でリッスンを開始（ポートはカスタマイズ可能）
await startClient(Client.Instance, 4567);
```

## 開発ビルド

> **開発環境では、Node.js バージョン 18 以上が必要です**

- 依存関係のインストール:
```
pnpm install
```

- ビルド:
```
pnpm build
```

## ライセンス
[GPL-3.0](https://github.com/ikenxuan/amagi/blob/main/LICENSE)

## 免責事項
このライブラリにはバックドアがなく、あなたの情報を第三者にアップロードすることはありません。構成されたCKは、公式APIインターフェースへのリクエストにのみ使用されます。

このプロジェクトのコードは [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) から派生しており、修正と公開が行われています。

<h2>許可なく、このプロジェクトのオープンソースコードを商業目的に使用することを禁じます。このプロジェクトの使用に起因するすべての問題および結果は使用者が全責任を負い、開発者は一切の責任を負いません。</h2>
