import { source } from '@/lib/source';
import { notFound } from 'next/navigation';

export const revalidate = false;

type RouteContext = {
  params: Promise<{
    slug?: string[];
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const page = source.getPage(slug);
  
  if (!page) {
    notFound();
  }

  const raw = await page.data.getText('raw');

  return new Response(raw, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
