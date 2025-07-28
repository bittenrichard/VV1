// Caminho: /src/features/results/components/ResultsPage.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import UploadArea from './UploadArea';
import CandidateTable from './CandidateTable';
import KanbanBoard from './KanbanBoard';
import { JobPosting } from '../../screening/types';
import { Candidate } from '../types';
import { sendCurriculumsToWebhook, sendScheduleToWebhook } from '../../../shared/services/webhookService';
import { useAuth } from '../../auth/hooks/useAuth';
import { baserow } from '../../../shared/services/baserowClient';
import CandidateDetailModal from './CandidateDetailModal';
import ScheduleModal from '../../agenda/components/ScheduleModal';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useGoogleAuth } from '../../../shared/hooks/useGoogleAuth';

const AGENDAMENTOS_TABLE_ID = '713';

const ResultsPage: React.FC<{ selectedJob: JobPosting | null; candidates: Candidate[]; onDataSynced: () => void; }> = ({ selectedJob, candidates, onDataSynced }) => {
  const { profile } = useAuth();
  const { isGoogleConnected } = useGoogleAuth();
  
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [jobCandidates, setJobCandidates] = useState<Candidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [candidateToSchedule, setCandidateToSchedule] = useState<Candidate | null>(null);

  useEffect(() => {
    if (selectedJob) {
      const filtered = candidates.filter(c => c.vaga && c.vaga.some(v => v.id === selectedJob.id));
      setJobCandidates(filtered);
    }
  }, [selectedJob, candidates]);
  
  const handleUpdateCandidateStatus = async (candidateId: number, newStatus: 'Triagem' | 'Entrevista' | 'Aprovado' | 'Reprovado') => {
    // ... (código existente)
  };

  const handleFilesSelected = async (files: FileList) => {
    // ... (código existente)
  };
  
  const handleScheduleSubmit = async (details: { start: Date; end: Date; title: string; details: string; }) => {
    if (!candidateToSchedule || !selectedJob || !profile) return;
    const newEvent = {
      'Título': details.title, 'Início': details.start.toISOString(), 'Fim': details.end.toISOString(),
      'Detalhes': details.details, 'Candidato': [candidateToSchedule.id], 'Vaga': [selectedJob.id]
    };
    try {
      await baserow.post(AGENDAMENTOS_TABLE_ID, newEvent);
      await sendScheduleToWebhook({
        candidateName: candidateToSchedule.nome, jobTitle: selectedJob.titulo,
        startTime: details.start.toISOString(), endTime: details.end.toISOString(),
        details: details.details, recruiterEmail: profile.email
      });
      setUploadSuccessMessage("Entrevista agendada e enviada para o Google Calendar com sucesso!");
    } catch (error) {
      console.error("Falha ao criar agendamento:", error);
      setUploadError("Não foi possível agendar a entrevista. Tente novamente.");
    }
  };

  const handleViewDetails = (candidate: Candidate) => setSelectedCandidate(candidate);
  const handleCloseDetailModal = () => setSelectedCandidate(null);
  
  const handleOpenScheduleModal = (candidate: Candidate) => {
    if (!isGoogleConnected) {
      alert("Por favor, conecte sua conta do Google na página de Configurações para agendar entrevistas.");
      return;
    }
    setCandidateToSchedule(candidate);
    setIsScheduleModalOpen(true);
  };
  
  const handleCloseScheduleModal = () => {
    setCandidateToSchedule(null);
    setIsScheduleModalOpen(false);
  };

  if (!selectedJob) return (<div className="text-center p-10"><h3 className="text-xl font-semibold">Nenhuma vaga selecionada</h3></div>);

  return (
    <>
      <div className="fade-in h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
              <h3 className="text-2xl font-semibold">Resultados: {selectedJob?.titulo}</h3>
              <p className="text-gray-600">Arraste e solte os candidatos para gerenciar o fluxo.</p>
          </div>
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`} title="Visão em Tabela"><List size={20} /></button>
            <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`} title="Visão em Kanban"><LayoutGrid size={20} /></button>
          </div>
        </div>
        
        {uploadSuccessMessage && (<div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700"><CheckCircle size={18} /> {uploadSuccessMessage}</div>)}
        {uploadError && (<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center"><AlertCircle size={18} className="text-red-700 mr-2" /><p className="text-red-700">{uploadError}</p></div>)}
        
        <UploadArea onFilesSelected={handleFilesSelected} isUploading={isProcessing} />

        <div className="flex-grow">
          {viewMode === 'table' ? (
              <CandidateTable candidates={jobCandidates} onViewDetails={handleViewDetails} requestSort={() => {}} sortConfig={{key: 'score', direction: 'descending'}}/>
          ) : (
              <KanbanBoard 
                candidates={jobCandidates} 
                onUpdateStatus={handleUpdateCandidateStatus} 
                onViewDetails={handleViewDetails}
                onScheduleInterview={handleOpenScheduleModal}
              />
          )}
        </div>
      </div>
      
      {selectedCandidate && (<CandidateDetailModal candidate={selectedCandidate} onClose={handleCloseDetailModal} />)}
      
      <ScheduleModal 
        isOpen={isScheduleModalOpen}
        onClose={handleCloseScheduleModal}
        candidate={candidateToSchedule}
        onSchedule={handleScheduleSubmit}
      />
    </>
  );
};

export default ResultsPage;