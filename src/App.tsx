import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PortfolioPage } from '@/features/portefeuille/PortfolioPage'
import { ClientDetailPage } from '@/features/portefeuille/ClientDetailPage'
import { ValidationQueue } from '@/features/validations/ValidationQueue'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PortfolioPage />} />
          <Route path="clients/:clientId" element={<ClientDetailPage />} />
          <Route path="validations" element={<ValidationQueue />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
