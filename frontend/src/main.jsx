import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'

// Auth pages
import Register from './pages/auth/Register'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Job pages
import Jobs from './pages/jobs/Jobs'
import JobDetail from './pages/jobs/JobDetail'

// Applicant pages
import MyApplications from './pages/applicant/MyApplications'
import Recommended from './pages/applicant/Recommended'

// Employer pages
import MyListings from './pages/employer/MyListings'
import NewListing from './pages/employer/NewListing'
import EditListing from './pages/employer/EditListing'
import ListingApplicants from './pages/employer/ListingApplicants'
import Dashboard from './pages/employer/Dashboard'

// Shared pages
import Profile from './pages/shared/Profile'
import NotFound from './pages/shared/NotFound'

// Components
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Navbar />
          <Routes>
            {/* Public routes */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Public job routes */}
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            
            {/* Protected routes */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* Applicant routes */}
            <Route path="/recommended" element={
              <RoleRoute allowedRole="APPLICANT">
                <Recommended />
              </RoleRoute>
            } />
            <Route path="/my-applications" element={
              <RoleRoute allowedRole="APPLICANT">
                <MyApplications />
              </RoleRoute>
            } />
            
            {/* Employer routes */}
            <Route path="/my-listings" element={
              <RoleRoute allowedRole="EMPLOYER">
                <MyListings />
              </RoleRoute>
            } />
            <Route path="/my-listings/new" element={
              <RoleRoute allowedRole="EMPLOYER">
                <NewListing />
              </RoleRoute>
            } />
            <Route path="/my-listings/:id/edit" element={
              <RoleRoute allowedRole="EMPLOYER">
                <EditListing />
              </RoleRoute>
            } />
            <Route path="/my-listings/:id/applicants" element={
              <RoleRoute allowedRole="EMPLOYER">
                <ListingApplicants />
              </RoleRoute>
            } />
            <Route path="/dashboard" element={
              <RoleRoute allowedRole="EMPLOYER">
                <Dashboard />
              </RoleRoute>
            } />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/jobs" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)
