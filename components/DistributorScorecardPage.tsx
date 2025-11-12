import React, { useState, useMemo } from 'react';
// FIX: Corrected the import from GoogleGenerativeAI to GoogleGenAI and added Type for schema definition
import { GoogleGenAI, Type } from '@google/genai';
import { api } from '../services/api';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import { ClipboardList, Award, Sparkles, AlertTriangle, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserRole, OrderStatus } from '../types';
import { Link } from 'react-router-dom';

interface ScorecardEntry {
    distributorId: string;
    distributorName: string;
    score: number;
    explanation: string[];
}

const ScorecardItem: React.FC<{ entry: ScorecardEntry, rank: number }> = React.memo(({ entry, rank }) => {
    const getScoreColor = (score: number) => {
        if (score >= 80) return { bg: 'bg-green-600', text: 'text-green-100', border: 'border-green-700' };
        if (score >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-100', border: 'border-yellow-600' };
        return { bg: 'bg-red-600', text: 'text-red-100', border: 'border-red-700' };
    };

    const scoreColor = getScoreColor(entry.score);

    return (
        <Card className="flex flex-col md:flex-row items-start gap-4">
            <div className="flex-shrink-0 w-full md:w-24 flex md:flex-col items-center justify-between md:justify-center text-center gap-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${scoreColor.bg} ${scoreColor.text} border-4 ${scoreColor.border}`}>
                    <span className="text-3xl font-bold">{entry.score}</span>
                </div>
                <div className="text-sm font-semibold text-contentSecondary">Rank #{rank}</div>
            </div>
            <div className="border-t md:border-t-0 md:border-l border-border w-full md:w-auto pt-4 md:pt-0 md:pl-4">
                <Link to={`/distributors/${entry.distributorId}`} className="text-lg font-bold text-primary hover:underline">
                    {entry.distributorName}
                </Link>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-contentSecondary">
                    {entry.explanation.map((line, index) => <li key={index}>{line}</li>)}
                </ul>
            </div>
        </Card>
    );
});


const DistributorScorecardPage: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const [scorecardData, setScorecardData] = useState<ScorecardEntry[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleGenerate = async () => {
        if (!portal) return;
        setLoading(true);
        setError(null);
        setScorecardData(null);

        try {
            // 1. Fetch all necessary data based on portal context
            const [distributors, orders, orderItems, schemes] = await Promise.all([
                api.getDistributors(portal),
                api.getOrders(portal),
                api.getAllOrderItems(portal),
                api.getSchemes(portal),
            ]);
            
            // 2. Pre-process and summarize data for the AI
            const distributorPerformanceData = distributors.map(dist => {
                const distOrders = orders.filter(o => o.distributorId === dist.id && o.status === OrderStatus.DELIVERED);
                const distOrderIds = new Set(distOrders.map(o => o.id));

                const totalSalesVolume = distOrders.reduce((sum, o) => sum + o.totalAmount, 0);
                const orderFrequency = distOrders.length;

                let schemeParticipationOrders = 0;
                const today = new Date().toISOString().split('T')[0];
                const activeSchemes = schemes.filter(s => s.startDate <= today && s.endDate >= today);

                distOrders.forEach(order => {
                    const itemsInOrder = orderItems.filter(i => i.orderId === order.id && !i.isFreebie);
                    let participatedInThisOrder = false;
                    for (const scheme of activeSchemes) {
                        if (scheme.isGlobal || scheme.distributorId === dist.id) {
                            const boughtItem = itemsInOrder.find(i => i.skuId === scheme.buySkuId);
                            if (boughtItem && boughtItem.quantity >= scheme.buyQuantity) {
                                participatedInThisOrder = true;
                                break;
                            }
                        }
                    }
                    if (participatedInThisOrder) {
                        schemeParticipationOrders++;
                    }
                });

                return {
                    distributorId: dist.id,
                    distributorName: dist.name,
                    totalSalesVolume: totalSalesVolume,
                    orderFrequency: orderFrequency,
                    schemeParticipationOrders: schemeParticipationOrders
                };
            });

            const dataContext = JSON.stringify(distributorPerformanceData);
            
            // 3. Define response schema for AI
            const responseSchema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        distributorId: { type: Type.STRING },
                        distributorName: { type: Type.STRING },
                        score: { type: Type.NUMBER, description: "A score from 0 to 100" },
                        explanation: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "A list of 2-3 bullet points explaining the score."
                        },
                    },
                    required: ['distributorId', 'distributorName', 'score', 'explanation']
                },
            };

            // 4. Construct a more focused prompt
            const fullPrompt = `
                You are an expert business analyst. Analyze the provided JSON data which contains pre-summarized performance metrics for each distributor.
                For each distributor, calculate a performance score from 0 to 100 based on these factors:
                1. 'totalSalesVolume': This is the most important positive factor. Higher is much better.
                2. 'orderFrequency': A higher number of orders indicates consistent business. This is an important factor.
                3. 'schemeParticipationOrders': A higher number of orders where a scheme was applied is a positive signal of engagement.
                
                Consider the relative performance of distributors against each other. The top performer in sales should get a very high score. A distributor with zero sales should get a very low score.
                For each distributor, provide the calculated score and a brief, 2-3 bullet point explanation for the score.

                Here is the pre-summarized performance data:
                ${dataContext}

                Return your response as a JSON array that strictly adheres to the provided schema. The output must be only the JSON array.
            `;
            
            // 5. Call Gemini API
            // @ts-ignore
            const apiKey = process.env.API_KEY;
            if (!apiKey) throw new Error("API_KEY environment variable not set.");
            // FIX: Initialize with named apiKey parameter.
            const ai = new GoogleGenAI({ apiKey });

            // FIX: Use ai.models.generateContent with updated model and config.
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema,
                }
            });

            // FIX: Access the text response directly from the .text property.
            const textResponse = response.text;
            if (!textResponse) {
                throw new Error("AI model returned an empty response. This could be due to a content filter or an issue with the prompt. Please try again.");
            }
            
            const parsedResponse = JSON.parse(textResponse);
            const sortedData = parsedResponse.sort((a: ScorecardEntry, b: ScorecardEntry) => b.score - a.score);
            setScorecardData(sortedData);

        } catch (err) {
            console.error("Scorecard Generation Error:", err);
            let errorMessage = "An unknown error occurred while generating the scorecard.";
            if (err instanceof Error) {
                if (err.message.includes('API_KEY')) {
                    errorMessage = "The AI service is not configured. Please contact support.";
                } else if (err.message.toLowerCase().includes('network') || err.message.toLowerCase().includes('failed to fetch')) {
                    errorMessage = "A network error occurred. Please check your internet connection and try again.";
                } else if (err.message.includes('empty response')) {
                    errorMessage = "The AI model returned an empty response. This may be due to a content filter or a temporary issue. Please try again.";
                } else {
                    errorMessage = err.message;
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        if (!scorecardData) return [];
        return scorecardData.filter(entry =>
            entry.distributorName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [scorecardData, searchTerm]);
    
    const canAccess = currentUser?.permissions?.includes('/distributor-scorecard');

    if (!canAccess) {
        return (
            <Card className="text-center">
                <p className="text-contentSecondary">You do not have permission to view this page.</p>
            </Card>
        );
    }


    return (
        <div className="space-y-6 max-w-4xl mx-auto">
             <div className="text-center">
                <ClipboardList size={48} className="mx-auto text-primary" />
                <h1 className="text-3xl font-bold mt-4 text-content">Distributor Performance Scorecard</h1>
                <p className="mt-2 text-contentSecondary">Use AI to analyze and rank distributors based on sales, order frequency, and scheme participation.</p>
                <Button onClick={handleGenerate} disabled={loading} className="mt-6">
                    {loading ? 'Analyzing...' : 'Generate Scorecard'}
                </Button>
            </div>

            {loading && (
                 <div className="flex flex-col items-center justify-center p-8 space-y-4">
                    <Sparkles size={32} className="text-primary animate-pulse" />
                    <p className="text-contentSecondary">AI is analyzing performance data... this may take a moment.</p>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start text-sm">
                    <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0"/>
                    <div>
                        <h3 className="font-semibold">Analysis Failed</h3>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {scorecardData && (
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                        <h2 className="text-xl font-bold text-content flex items-center"><Award size={24} className="mr-2 text-primary"/> Performance Rankings</h2>
                        <div className="w-full sm:w-auto sm:max-w-xs">
                             <Input
                                id="search-scorecard"
                                placeholder="Search distributors..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                icon={<Search size={16} />}
                            />
                        </div>
                    </div>
                     <div className="space-y-4">
                        {filteredData.length > 0 ? (
                            filteredData.map((entry, index) => (
                                <ScorecardItem key={entry.distributorId} entry={entry} rank={scorecardData.findIndex(item => item.distributorId === entry.distributorId) + 1} />
                            ))
                        ) : (
                             <p className="text-center p-8 text-contentSecondary">No distributors found for "{searchTerm}".</p>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default DistributorScorecardPage;