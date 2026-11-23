export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Zero-friction guest entry: builders can enter the portal without logging in.
  return <>{children}</>
}
