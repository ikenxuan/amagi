import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: '@ikenxuan/amagi',
    },
    links: [
      {
        text: 'GitHub',
        url: 'https://github.com/ikenxuan/amagi',
        external: true,
      },
      {
        text: 'API 文档',
        url: 'https://amagi.apifox.cn',
        external: true,
      },
    ],
  };
}
