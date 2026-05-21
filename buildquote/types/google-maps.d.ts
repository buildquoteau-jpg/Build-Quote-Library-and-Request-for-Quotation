declare global {
  interface Window {
    google?: any
    initGooglePlaces?: () => void
    initProfilePlaces?: () => void
    initSupplierMap?: () => void
  }
}
export {}
