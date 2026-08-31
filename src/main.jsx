
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/Authcontext';
import { ToastProvider } from './components/Toast';

import LoginPage from './pages/LoginPage';
// import RegisterEmployeePage from './pages/RegisterEmployeePage';
import EmployeeHome from './pages/EmployeeHome';
import PlanPage from './pages/PlanPage';
import QuotationsListPage from './pages/Quotationspage';
import QuotationPage from './pages/Quotationpage';
import QuotationFormPage from './pages/Quotationformpage';
import RequireAuth from './auth/RequireAuth';

/**
 * A quotation gets its own URL rather than living in component state.
 *
 * The reason is the job: a salesman has one open, the customer asks a
 * question, he goes to the map to check a neighbouring plot and comes
 * back. With the quotation held in state that round trip loses it. With
 * a URL the back button returns to it, the browser's history works, and
 * a colleague can be sent a link to the exact record.
 *
 * `new` sits before `:id` so the literal wins — otherwise
 * /quotations/new resolves as a quotation whose id is the word "new".
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          

            <Route path="/" element={<RequireAuth><EmployeeHome /></RequireAuth>} />
<Route path="/quotations" element={<RequireAuth><QuotationsListPage /></RequireAuth>} />
<Route path="/quotations/new" element={<RequireAuth><QuotationFormPage /></RequireAuth>} />
<Route path="/quotations/:id" element={<RequireAuth><QuotationPage /></RequireAuth>} />
<Route path="/quotations/:id/edit" element={<RequireAuth><QuotationFormPage /></RequireAuth>} />
<Route path="/maps/:mapId/*" element={<RequireAuth><PlanPage /></RequireAuth>} />

<Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
