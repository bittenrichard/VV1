import React, { useState, useMemo, useEffect } from 'react';
import { baserow } from '../../../shared/services/baserowClient';
import { useAuth } from '../../auth/hooks/useAuth';
import { Candidate } from '../../results/types';
import { Search, Download, Briefcase, Star, Loader2, FilterX, Filter, ChevronDown, Eye, MessageCircle, User, BookOpen } from 'lucide-react';
import CandidateDetailModal from '../../results/components/CandidateDetailModal';
import { formatPhoneNumberForWhatsApp } from '../../../shared/utils/formatters';

// Opções para os novos filtros
const sexOptions = ['Masculino', 'Feminino', 'Outro'];
const escolaridadeOptions = [
  'Ensino fundamental incompleto',
  'Ensino fundamental completo',
  'Ensino médio incompleto',
  'Ensino médio completo',
  'Superior incompleto',
  'Superior completo',
  'Pós-graduação',
  'Mestrado',
  'Doutorado',
];


const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        <h2 className="mt-4 text-xl font-semibold text-gray-800">Carregando Talentos...</h2>
    </div>
);

const CandidateDatabasePage: React.FC = () => {
    const { profile } = useAuth();
    const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Estados dos filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVaga, setSelectedVaga] = useState('');
    const [selectedSexo, setSelectedSexo] = useState('');
    const [selectedEscolaridade, setSelectedEscolaridade] = useState('');
    const [minIdade, setMinIdade] = useState('');
    const [maxIdade, setMaxIdade] = useState('');

    const [showFilters, setShowFilters] = useState(true);
    const [vagas, setVagas] = useState<string[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    useEffect(() => {
        const fetchAllUserCandidates = async () => {
            if (!profile) return;
            setIsLoading(true);
            try {
                const CANDIDATOS_TABLE_ID = '710';
                const WHATSAPP_CANDIDATOS_TABLE_ID = '712';

                const regularPromise = baserow.get(CANDIDATOS_TABLE_ID, `?user_field_names=true&filter__usuario__contains=${profile.id}`);
                const whatsappPromise = baserow.get(WHATSAPP_CANDIDATOS_TABLE_ID, `?user_field_names=true&filter__usuario__contains=${profile.id}`);
                
                const [regularResult, whatsappResult] = await Promise.all([regularPromise, whatsappPromise]);

                const combined = [...(regularResult.results || []), ...(whatsappResult.results || [])];
                setAllCandidates(combined);

                const uniqueVagas = [...new Set(combined.flatMap(c => c.vaga?.map(v => v.value) || []).filter(Boolean))].sort();
                setVagas(uniqueVagas);

            } catch (error) {
                console.error("Erro ao buscar o banco de talentos:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllUserCandidates();
    }, [profile]);

    const filteredCandidates = useMemo(() => {
        return allCandidates.filter(candidate => {
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = searchTerm ? candidate.nome.toLowerCase().includes(searchLower) : true;
            const vagaMatch = selectedVaga ? candidate.vaga?.some(v => v.value === selectedVaga) : true;
            const sexoMatch = selectedSexo ? candidate.sexo?.value === selectedSexo : true;
            const escolaridadeMatch = selectedEscolaridade ? candidate.escolaridade?.value === selectedEscolaridade : true;
            const minIdadeNum = minIdade ? parseInt(minIdade) : 0;
            const maxIdadeNum = maxIdade ? parseInt(maxIdade) : Infinity;
            const idadeMatch = candidate.idade ? candidate.idade >= minIdadeNum && candidate.idade <= maxIdadeNum : true;

            return nameMatch && vagaMatch && sexoMatch && escolaridadeMatch && idadeMatch;
        });
    }, [allCandidates, searchTerm, selectedVaga, selectedSexo, selectedEscolaridade, minIdade, maxIdade]);
    
    const clearFilters = () => {
        setSearchTerm('');
        setSelectedVaga('');
        setSelectedSexo('');
        setSelectedEscolaridade('');
        setMinIdade('');
        setMaxIdade('');
    };

    const activeFilterCount = [searchTerm, selectedVaga, selectedSexo, selectedEscolaridade, minIdade, maxIdade].filter(Boolean).length;

    if (isLoading) return <LoadingSpinner />;

    return (
        <>
            <div className="fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Banco de Talentos</h1>
                        <p className="text-gray-600">Pesquise e reaproveite candidatos de processos seletivos anteriores.</p>
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-semibold rounded-md hover:bg-gray-50 border border-gray-300 transition-colors shadow-sm">
                        <Filter size={18} className="text-indigo-600"/>
                        <span>Filtros</span>
                        {activeFilterCount > 0 && (<span className="bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{activeFilterCount}</span>)}
                        <ChevronDown size={18} className={`transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="mb-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                            <h3 className="text-lg font-semibold text-gray-800">Filtros Avançados</h3>
                            <button onClick={clearFilters} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                                <FilterX size={16} /> Limpar Filtros
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Filtros existentes e novos */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por nome</label>
                                <input type="text" placeholder="Nome do candidato..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full text-sm border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vaga</label>
                                <select value={selectedVaga} onChange={e => setSelectedVaga(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                                    <option value="">Todas</option>
                                    {vagas.map(vaga => <option key={vaga} value={vaga}>{vaga}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                                <select value={selectedSexo} onChange={e => setSelectedSexo(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                                    <option value="">Todos</option>
                                    {sexOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Escolaridade</label>
                                <select value={selectedEscolaridade} onChange={e => setSelectedEscolaridade(e.target.value)} className="w-full text-sm border-gray-300 rounded-md">
                                    <option value="">Todas</option>
                                    {escolaridadeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end gap-2 col-span-2 sm:col-span-1">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Idade Mín.</label>
                                    <input type="number" placeholder="Ex: 25" value={minIdade} onChange={e => setMinIdade(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Idade Máx.</label>
                                    <input type="number" placeholder="Ex: 40" value={maxIdade} onChange={e => setMaxIdade(e.target.value)} className="w-full text-sm border-gray-300 rounded-md"/>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                     <h3 className="text-xl font-bold text-gray-800 mb-6">
                        {activeFilterCount > 0 ? `Candidatos Encontrados (${filteredCandidates.length})` : `Todos os Candidatos (${allCandidates.length})`}
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           {/* ... o resto da tabela continua igual ... */}
                        </table>
                    </div>
                </div>
            </div>
            {selectedCandidate && (<CandidateDetailModal candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />)}
        </>
    );
};

export default CandidateDatabasePage;