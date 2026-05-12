import { Routes } from "react-router-dom"
import publicRoutes from "./routes/PublicRoutes"
import privateRoutes from "./routes/PrivateRoutes"
import ConfirmDialog from "./components/ui/ConfirmDialog"
import ToastViewport from "./components/ui/ToastViewport"
import { useAuthBootstrap } from "./hooks/useAuthBootstrap"

function App() {
  // Validate the persisted auth hint against /auth/me once per page load.
  // Routes wait on `bootstrapped` before deciding who you are.
  useAuthBootstrap()

  return (
    <>
      <Routes>
        {publicRoutes}
        {privateRoutes}
      </Routes>
      {/* Mounted once. Both render nothing when idle. */}
      <ConfirmDialog />
      <ToastViewport />
    </>
  )
}

export default App
