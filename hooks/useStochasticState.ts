import { useState, useCallback, useMemo, useEffect } from 'react';
import { CsvData, VariableInfo, ModelDef, TransitionMatrixModelDef, AnalysisMode } from '../types';
import { parseCsvData, detectAnalysisMode, analyzeCsvStructure } from '../utils/csvParser';

const AUTOSAVE_KEY = 'stochasticAppAutosave';

export const useStochasticState = (exampleData: string) => {
    const [stagedCsvString, setStagedCsvString] = useState<string>(exampleData);
    const [submittedCsvString, setSubmittedCsvString] = useState<string>(exampleData);

    const [models, setModels] = useState<ModelDef[]>([]);
    const [transitionMatrixModels, setTransitionMatrixModels] = useState<TransitionMatrixModelDef[]>([]);
    
    const [variableInfo, setVariableInfo] = useState<VariableInfo[]>([]);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [pendingVariableInfo, setPendingVariableInfo] = useState<VariableInfo[]>([]);

    useEffect(() => {
        const savedStateJSON = localStorage.getItem(AUTOSAVE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                if (savedState.submittedCsvString) {
                    setSubmittedCsvString(savedState.submittedCsvString);
                    setStagedCsvString(savedState.submittedCsvString);
                }
                if (savedState.variableInfo) setVariableInfo(savedState.variableInfo);
                if (savedState.models) setModels(savedState.models);
                if (savedState.transitionMatrixModels) setTransitionMatrixModels(savedState.transitionMatrixModels);
            } catch (e) {
                console.error("Failed to parse saved state from localStorage:", e);
                localStorage.removeItem(AUTOSAVE_KEY);
            }
        } else {
            const initialParsed = parseCsvData(exampleData);
            setVariableInfo(analyzeCsvStructure(initialParsed));
        }
    }, [exampleData]);

    useEffect(() => {
        setSaveStatus('saving');
        const handler = setTimeout(() => {
            try {
                const stateToSave = {
                    submittedCsvString,
                    variableInfo,
                    models,
                    transitionMatrixModels,
                };
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(stateToSave));
                setSaveStatus('saved');
                
                const resetHandler = setTimeout(() => setSaveStatus('idle'), 2000);
                return () => clearTimeout(resetHandler);

            } catch (e) {
                console.error("Failed to save state to localStorage:", e);
                setSaveStatus('idle');
            }
        }, 1000);

        return () => clearTimeout(handler);
    }, [submittedCsvString, variableInfo, models, transitionMatrixModels]);

    const parsedData = useMemo<CsvData>(() => {
        try {
            return parseCsvData(submittedCsvString);
        } catch (e) {
            console.error("CSV parsing error:", e);
            return { headers: [], rows: [] };
        }
    }, [submittedCsvString]);

    const analysisMode = useMemo(() => detectAnalysisMode(parsedData), [parsedData]);
    const isEnsemble = analysisMode === 'timeSeriesEnsemble';
    
    const variableInfoString = useMemo(() => JSON.stringify(variableInfo), [variableInfo]);

    useEffect(() => {
        const newVarInfoMap = new Map(variableInfo.map(v => [v.name, v]));

        setModels(prevModels => {
            if (variableInfo.length === 0) return [];
        
            return prevModels.map(model => {
                const validModelVars = (model.variables || []).filter(v => v && typeof v === 'object') as VariableInfo[];
                const modelVarMap = new Map(validModelVars.map(v => [v.name, v]));
                
                const modelVarNames = new Set(validModelVars.map(v => v.name));
                const newVarNames = new Set(variableInfo.map(v => v.name));
                const areVarSetsEqual = modelVarNames.size === newVarNames.size && [...modelVarNames].every(name => newVarNames.has(name));

                let probabilitiesNeedReset = !areVarSetsEqual;

                const syncedVariables = variableInfo.map(newInfoFromData => {
                    const existingModelVar = modelVarMap.get(newInfoFromData.name);
                    if (existingModelVar) {
                        if (existingModelVar.states !== newInfoFromData.states) {
                            probabilitiesNeedReset = true;
                        }
                        return { ...existingModelVar, states: newInfoFromData.states };
                    } else {
                        return JSON.parse(JSON.stringify(newInfoFromData));
                    }
                });
                
                if (JSON.stringify(model.variables) === JSON.stringify(syncedVariables)) return model;

                return {
                    ...model,
                    variables: syncedVariables,
                    probabilities: probabilitiesNeedReset ? {} : model.probabilities,
                    error: null,
                };
            });
        });
    }, [variableInfoString]);

    const handleDataSubmit = useCallback(() => {
        try {
            const data = parseCsvData(stagedCsvString);
            if (data.headers.length === 0 || data.rows.length === 0) {
                alert("The submitted CSV data is empty or invalid. Please provide data with a header row.");
                return;
            }
            const initialVarInfo = analyzeCsvStructure(data);
            setPendingVariableInfo(initialVarInfo);
            setIsTypeModalOpen(true);
        } catch (e: any) {
            alert(`Error parsing CSV: ${e.message}`);
        }
    }, [stagedCsvString]);

    const handleTypeConfirmation = useCallback((confirmedInfo: VariableInfo[]) => {
        setVariableInfo(confirmedInfo);
        setSubmittedCsvString(stagedCsvString);
        setModels([]);
        setTransitionMatrixModels([]);
        setIsTypeModalOpen(false);
    }, [stagedCsvString]);

    const handleCancelTypeConfirmation = useCallback(() => {
        setIsTypeModalOpen(false);
    }, []);

    const resetToExample = useCallback(() => {
        localStorage.removeItem(AUTOSAVE_KEY);
        const initialParsed = parseCsvData(exampleData);
        setStagedCsvString(exampleData);
        setSubmittedCsvString(exampleData);
        setVariableInfo(analyzeCsvStructure(initialParsed));
        setModels([]);
        setTransitionMatrixModels([]);
        setSaveStatus('idle');
    }, [exampleData]);

    return {
        stagedCsvString,
        setStagedCsvString,
        submittedCsvString,
        parsedData,
        variableInfo,
        models,
        setModels,
        transitionMatrixModels,
        setTransitionMatrixModels,
        analysisMode,
        isEnsemble,
        isTypeModalOpen,
        pendingVariableInfo,
        saveStatus,
        handleDataSubmit,
        handleTypeConfirmation,
        handleCancelTypeConfirmation,
        resetToExample,
    };
};
