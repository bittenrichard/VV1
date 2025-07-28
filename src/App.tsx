import React, { useEffect, useCallback, useState } from 'react';
import { useAuth } from './features/auth/hooks/useAuth';
import { useNavigation } from './shared/hooks/useNavigation';
import LoginPage from './features/auth/components/LoginPage';
import SignUpPage from './features/auth/components/SignUpPage';
import MainLayout from './shared/components/Layout/MainLayout';
import DashboardPage from './features/dashboard/components/DashboardPage';
import NewScreeningPage from './features/screening/components/NewScreeningPage';
import ResultsPage from './features/results/components/ResultsPage';
import SettingsPage from './features/settings/components/SettingsPage';
import { LoginCredentials, SignUpCredentials } from './features/auth/types';
import { JobPosting } from './features/screening/types';
import { Candidate } from './features/results/types';
import { baserow } from './shared/services/baserowClient';
import { Loader2 } from 'lucide-react';
import CandidateDatabasePage from './features/database/components/CandidateDatabasePage';
import AgendaPage from './features/agenda/components/AgendaPage';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 text-indigo-600 animate-spin" />
        <h2 className="mt-6 text-xl font-semibold text-gray-800">Carregando...</h2>
        <p className="mt-2 text-gray-500">Estamos preparando tudo para você.</p>
      </div>
    </div>
  );
};

const VAGAS_TABLE_ID = '709';
const CANDIDATOS_TABLE_ID = '710';
const WHATSAPP_CANDIDATOS_TABLE_ID = '712';

function App() {
  const {
    profile,
    isAuthenticated,
    isLoading: isAuthLoading,
    error: authError,
    signIn,
    signOut,
    signUp
  } = useAuth();

  const { currentPage, navigateTo } = useNavigation(isAuthenticated ? 'dashboard' : 'login');

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!profile) return;
    setIsDataLoading(true);
    try {
      const jobsPromise = baserow.get(VAGAS_TABLE_ID, '');
      const candidatesPromise = baserow.get(CANDIDATOS_TABLE_ID, '');
      const whatsappCandidatesPromise = baserow.get(WHATSAPP_CANDIDATOS_TABLE_ID, '');

      const [jobsResult, regularCandidatesResult, whatsappCandidatesResult] = await Promise.all([
        jobsPromise,
        candidatesPromise,
        whatsappCandidatesPromise
      ]);
      
      const normalizedWhatsappCandidates = (whatsappCandidatesResult.results || []).map((candidate: any) => {
        if (typeof candidate.vaga === 'string') {
          return {
            ...candidate,
            vaga: [{ id: 0, value: candidate.vaga }]
          };
        }
        return candidate;
      });

      const allCandidates = [
        ...(regularCandidatesResult.results || []),
        ...normalizedWhatsappCandidates
      ];

      const allJobs = jobsResult.results || [];

      const userJobs = allJobs.filter(job =>
        job.usuario && job.usuario.some(user => user.id === profile.id)
      );
      const userCandidates = allCandidates.filter(candidate =>
        candidate.usuario && candidate.usuario.some(user => user.id === profile.id)
      );

      setJobs(userJobs);
      setCandidates(userCandidates);

    } catch (error) {
      console.error("Erro ao buscar dados do Baserow:", error);
      setJobs([]);
      setCandidates([]);
    } finally {
      setIsDataLoading(false);
    }
  }, [profile]);


  useEffect(() => {
    if (isAuthenticated && profile) {
      fetchAllData();
    }
  }, [isAuthenticated, profile, fetchAllData]);

  const handleLogin = async (credentials: LoginCredentials) => {
    const success = await signIn(credentials);
    if (success) {
      navigateTo('dashboard');
    }
  };

  const handleSignUp = async (credentials: SignUpCredentials) => {
    const newUserProfile = await signUp(credentials);
    if (newUserProfile) {
      await handleLogin({ email: credentials.email, password: credentials.password });
    }
  };

  const handleLogout = () => {
    signOut();
    setJobs([]);
    setCandidates([]);
    setSelectedJob(null);
    navigateTo('login');
  };

  const handleViewResults = (job: JobPosting) => {
    setSelectedJob(job);
    navigateTo('results');
  };

  const handleJobCreated = (newJob: JobPosting) => {
    setJobs(prev => [newJob, ...prev]);
    setSelectedJob(newJob);
    navigateTo('results');
  };

  const handleDeleteJob = async (jobId: number) => {
      try {
          await baserow.delete(VAGAS_TABLE_ID, jobId);
          await fetchAllData();
      } catch (error) {
          console.error("Erro ao deletar vaga:", error);
          alert("Não foi possível excluir a vaga. Tente novamente.");
      }
  };

  if (isAuthLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <div className="font-inter antialiased">
        {currentPage === 'signup' ? (
            <SignUpPage onSignUp={handleSignUp} onNavigateLogin={() => navigateTo('login')} isLoading={isAuthLoading} error={authError} />
        ) : (
            <LoginPage onLogin={handleLogin} onNavigateSignUp={() => navigateTo('signup')} isLoading={isAuthLoading} error={authError} />
        )}
      </div>
    );
  }

  if (!profile || isDataLoading) {
    return <LoadingSpinner />;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage jobs={jobs} candidates={candidates} onViewResults={handleViewResults} onDeleteJob={handleDeleteJob} onNavigate={navigateTo} />;
      case 'new-screening':
        return <NewScreeningPage onJobCreated={handleJobCreated} onCancel={() => navigateTo('dashboard')} />;
      case 'results':
        return <ResultsPage selectedJob={selectedJob} candidates={candidates} onDataSynced={fetchAllData} />;
      case 'settings':
        return <SettingsPage />;
      case 'database':
        return <CandidateDatabasePage />;
      case 'agenda':
        return <AgendaPage />;
      default:
        return <DashboardPage jobs={jobs} candidates={candidates} onViewResults={handleViewResults} onDeleteJob={handleDeleteJob} onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="font-inter antialiased">
      <MainLayout currentPage={currentPage} user={profile} onNavigate={navigateTo} onLogout={handleLogout}>
        {renderContent()}
      </MainLayout>
    </div>
  );
}

export default App;