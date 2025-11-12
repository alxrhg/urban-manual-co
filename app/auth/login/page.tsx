import { redirect } from 'next/navigation';

function formatSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined) return;
    const stringValue = Array.isArray(value) ? value[value.length - 1] : value;
    if (!stringValue) return;

    if (key === 'redirect' && !searchParams['returnTo']) {
      params.set('returnTo', stringValue);
      return;
    }

    params.set(key, stringValue);
  });

  return params.toString();
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = formatSearchParams(searchParams);
  redirect(`/auth/sign-in${query ? `?${query}` : ''}`);
}
