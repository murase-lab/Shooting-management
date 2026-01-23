import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ModelProvider } from './context/ModelContext';
import { ProjectProvider } from './context/ProjectContext';
import { AuthProvider } from './context/AuthContext';
import InviteHandler from './components/InviteHandler';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import ProjectOverview from './pages/ProjectOverview';
import ProjectDetail from './pages/ProjectDetail';
import ProjectRegister from './pages/ProjectRegister';
import CutDetail from './pages/CutDetail';
import CutCreate from './pages/CutCreate';
import CutAdd from './pages/CutAdd';
import CutEdit from './pages/CutEdit';
import ModelList from './pages/ModelList';
import ModelDetail from './pages/ModelDetail';
import ModelRegister from './pages/ModelRegister';
import RoughAdjust from './pages/RoughAdjust';
import RedpenEdit from './pages/RedpenEdit';
import FinalPreview from './pages/FinalPreview';
import PropChecklist from './pages/PropChecklist';
import ShotChecklist from './pages/ShotChecklist';
import DeliveryProgress from './pages/DeliveryProgress';
import DeliveryPage from './pages/DeliveryPage';
import Settings from './pages/Settings';

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <ModelProvider>
          <ProjectProvider>
            <InviteHandler>
            <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/project-overview" element={<ProjectOverview />} />
                <Route path="/project-detail/:id" element={<ProjectDetail />} />
                <Route path="/project-register" element={<ProjectRegister />} />
                <Route path="/cut-detail" element={<CutDetail />} />
                <Route path="/cut-create" element={<CutCreate />} />
                <Route path="/cut-add/:projectId" element={<CutAdd />} />
                <Route path="/cut-edit/:projectId/:cutId" element={<CutEdit />} />
                <Route path="/model-list" element={<ModelList />} />
                <Route path="/model-detail/:id" element={<ModelDetail />} />
                <Route path="/model-register" element={<ModelRegister />} />
                <Route path="/rough-adjust" element={<RoughAdjust />} />
                <Route path="/redpen-edit" element={<RedpenEdit />} />
                <Route path="/final-preview/:id" element={<FinalPreview />} />
                <Route path="/prop-checklist" element={<PropChecklist />} />
                <Route path="/prop-checklist/:projectId" element={<PropChecklist />} />
                <Route path="/shot-checklist" element={<ShotChecklist />} />
                <Route path="/delivery-progress" element={<DeliveryProgress />} />
                <Route path="/delivery" element={<DeliveryPage />} />
                <Route path="/delivery/:projectId" element={<DeliveryPage />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
            </InviteHandler>
          </ProjectProvider>
        </ModelProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
