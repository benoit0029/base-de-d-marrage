import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PortfolioPage } from '@/features/portefeuille/PortfolioPage'
import { ClientDetailPage } from '@/features/portefeuille/ClientDetailPage'
import { ValidationQueue } from '@/features/validations/ValidationQueue'
import { FacturesPage } from '@/features/factures/FacturesPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { MfaChallengePage } from '@/features/auth/MfaChallengePage'
import { SecuritePage } from '@/features/securite/SecuritePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="mfa-challenge" element={<MfaChallengePage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<PortfolioPage />} />
          <Route path="clients/:clientId" element={<ClientDetailPage />} />
          <Route path="factures" element={<FacturesPage />} />
          <Route path="validations" element={<ValidationQueue />} />
          <Route path="securite" element={<SecuritePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
