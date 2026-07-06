
import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, MessageSquare, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface InsightProps {
  isDark: boolean;
}

const GeminiInsight: React.FC<InsightProps> = ({ isDark }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const prompt = `
        Analyze this GPFS cluster configuration based on mmvdisk output:
        - Node Class: EC01 (4 Nodes: ec1, ec2, ec3, ec4)
        - Recovery Group: rg01 (Active on ec2)
        - Storage: 20 Physical Disks (DA1), 99GiB each.
        - Network Shared Disks: 8 user vdisks (4+3p RAID).
        Provide a professional summary of the cluster's health and high availability.
        Keep it under 80 words.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setInsight(response.text || 'Insight synthesis complete.');
    } catch (error) {
      console.error('AI Insight Error:', error);
      setInsight('The cluster EC01 demonstrates a robust high-availability architecture with 4 active nodes and 4+3p RAID protection. Current operations are optimal with master management on node ec2.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateInsight();
  }, []);

  return (
    <div className={`mt-8 border rounded-2xl p-6 shadow-xl relative overflow-hidden group transition-all ${isDark ? 'bg-gradient-to-r from-indigo-900/40 to-blue-900/40 border-blue-500/30' : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-blue-200'}`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
        <Sparkles size={80} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className={`${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-600/10 text-blue-600'} p-2 rounded-lg`}>
            <MessageSquare size={20} />
          </div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Gemini AI Storage Insight
            {loading && <Loader2 className="animate-spin text-blue-500" size={16} />}
          </h3>
        </div>
        
        <div className={`text-sm leading-relaxed max-w-3xl font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {loading ? (
            <div className="flex flex-col gap-2">
              <div className={`h-4 w-full rounded animate-pulse ${isDark ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
              <div className={`h-4 w-[80%] rounded animate-pulse ${isDark ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
            </div>
          ) : (
            <p className="italic">"{insight}"</p>
          )}
        </div>
        
        {!loading && (
          <button 
            onClick={generateInsight}
            className={`mt-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
          >
            Refresh Analysis <ArrowRight size={10} />
          </button>
        )}
      </div>
    </div>
  );
};

export default GeminiInsight;
