import { Navigate } from "react-router-dom";

export default function ProtectedRoute({children}){
    const token=localStorage.getItem("jwt")
    if(!token)
        return <Navigate to='/'/>
    try {
        const decoded=JSON.parse(atob(token.split('.')[1]))
        if(!decoded?.email)
                throw new Error()
        return children
    } catch (error) {
        return <Navigate to='/' />
    }
}