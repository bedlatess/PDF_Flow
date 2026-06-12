export const getFirstQueryValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : typeof value === 'string' ? value : ''

export const resolveInternalRedirect = (value: unknown, fallback = '/') => {
  const redirect = getFirstQueryValue(value)
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return fallback
  }

  return redirect
}
