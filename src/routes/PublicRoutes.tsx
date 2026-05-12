import { Route } from "react-router-dom"
import Landing from "../pages/landingPage/Landing"
import Login from "../pages/auth/Login"
import Register from "../pages/auth/Register"
import ForgotPassword from "../pages/auth/ForgotPassword"
import ResetPassword from "../pages/auth/ResetPassword"
import VerifyEmail from "../pages/auth/VerifyEmail"
import PublicOnlyRoute from "./PublicOnlyRoute"

const publicRoutes = [
    <Route key="home" path="/" element={<Landing />} />,
    <Route key="verify-email" path="/verify-email" element={<VerifyEmail />} />,
    <Route key="public-only" element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
    </Route>,
]

export default publicRoutes
