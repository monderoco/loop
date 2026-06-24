export function navigate(path: string) {
  window.history.pushState(null, '', path)
  window.dispatchEvent(new Event('popstate'))
}
