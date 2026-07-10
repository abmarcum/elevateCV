'use client';

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Briefcase, 
  Sparkles, 
  History, 
  Copy, 
  Check, 
  ArrowRight, 
  FileText, 
  Search,
  CheckCircle,
  AlertCircle,
  FileCode,
  Globe
} from 'lucide-react';

interface Experience {
  role: string;
  company: string;
  duration: string;
  bullets: string[];
}

interface Profile {
  name: string;
  title: string;
  skills: string[];
  experience: Experience[];
  education: string[];
  summary: string;
}

interface JobMatch {
  id: number;
  title: string;
  company: string;
  url: string;
  description: string;
  matchScore: number;
  matchReason: string;
}

interface BulletSuggestion {
  original: string;
  suggested: string;
  explanation: string;
}

interface CurationResult {
  atsScore: number;
  keywordGaps: string[];
  bulletSuggestions: BulletSuggestion[];
  tailoredSummary: string;
  tailoredResume: string;
  coverLetter: string;
}

interface HistoryItem {
  id: string;
  date: string;
  name: string;
  title: string;
  jobTitle?: string;
  company?: string;
  atsScore?: number;
  profile: Profile;
  curation?: CurationResult;
}

// Custom simple markdown renderer to ensure React 19 compatibility
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-200">
      {lines.map((line, idx) => {
        let cleanLine = line.trim();
        
        // Headers
        if (cleanLine.startsWith('# ')) {
          return <h1 key={idx} className="text-xl font-bold text-white mt-4 mb-2">{cleanLine.substring(2)}</h1>;
        }
        if (cleanLine.startsWith('## ')) {
          return <h2 key={idx} className="text-lg font-bold text-white mt-3 mb-2">{cleanLine.substring(3)}</h2>;
        }
        if (cleanLine.startsWith('### ')) {
          return <h3 key={idx} className="text-base font-bold text-white mt-2 mb-1">{cleanLine.substring(4)}</h3>;
        }
        
        // Bullet points
        if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
          const listText = cleanLine.substring(2);
          return (
            <ul key={idx} className="list-disc pl-5 my-1">
              <li>{parseBoldText(listText)}</li>
            </ul>
          );
        }

        // Empty lines
        if (cleanLine.length === 0) {
          return <div key={idx} className="h-2" />;
        }

        // Standard paragraphs
        return <p key={idx}>{parseBoldText(cleanLine)}</p>;
      })}
    </div>
  );
};

// Helper function to format bold text markdown **text**
function parseBoldText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="text-indigo-300 font-semibold">{part}</strong> : part));
}

export default function Home() {
  // Application State
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [rawResumeText, setRawResumeText] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [searchingJobs, setSearchingJobs] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null);
  
  // Custom job description option
  const [customJobTitle, setCustomJobTitle] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [customJobDesc, setCustomJobDesc] = useState('');
  
  // Curation result state
  const [curationLoading, setCurationLoading] = useState(false);
  const [curationResult, setCurationResult] = useState<CurationResult | null>(null);
  const [creativeMode, setCreativeMode] = useState(false);
  const [domains, setDomains] = useState<string[]>([
    'jobs.apple.com',
    'careers.cisco.com',
    'careers.google.com',
    'nvidia.wd5.myworkdayjobs.com',
    'explore.jobs.netflix.net'
  ]);
  const [newDomain, setNewDomain] = useState('');
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<number, boolean>>({});
  const [excludeDomains, setExcludeDomains] = useState<string[]>(['metacareers.com', 'hiring.amazon.com']);
  const [newExcludeDomain, setNewExcludeDomain] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  
  // Custom suggestion feature states
  const [resumePreviewMode, setResumePreviewMode] = useState<'markdown' | 'preview'>('preview'); // default to preview for premium look!
  const [coverTone, setCoverTone] = useState<string>('Professional');
  const [generatingCoverTone, setGeneratingCoverTone] = useState(false);
  
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [loadingInterview, setLoadingInterview] = useState(false);
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(null);
  
  const [learningPath, setLearningPath] = useState<any[]>([]);
  const [loadingLearningPath, setLoadingLearningPath] = useState(false);

  // Tabs: 'matcher' | 'optimizer' | 'history'
  const [activeTab, setActiveTab] = useState<'matcher' | 'optimizer' | 'history'>('matcher');
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

  // Premium Features States
  const [editedMarkdown, setEditedMarkdown] = useState<string>('');
  const [outreachText, setOutreachText] = useState<string>('');
  const [outreachStyle, setOutreachStyle] = useState<'email' | 'linkedin'>('linkedin');
  const [outreachTone, setOutreachTone] = useState<'professional' | 'short_direct' | 'bold'>('professional');
  const [generatingOutreach, setGeneratingOutreach] = useState(false);
  const [copiedOutreach, setCopiedOutreach] = useState(false);

  // Auto-save edited resume to session logs
  useEffect(() => {
    if (historyList.length > 0 && editedMarkdown) {
      const updated = [...historyList];
      if (updated[0] && updated[0].curation) {
        if (updated[0].curation.tailoredResume !== editedMarkdown) {
          updated[0].curation = {
            ...updated[0].curation,
            tailoredResume: editedMarkdown
          };
          setHistoryList(updated);
          localStorage.setItem('resume_tailor_history', JSON.stringify(updated));
        }
      }
    }
  }, [editedMarkdown]);

  // Load History from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('resume_tailor_history');
    if (saved) {
      try {
        setHistoryList(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history from localStorage', e);
      }
    }
  }, []);

  // Save item to history
  const saveToHistory = (prof: Profile, cur?: CurationResult, jobT?: string, comp?: string) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      name: prof.name,
      title: prof.title,
      jobTitle: jobT,
      company: comp,
      atsScore: cur?.atsScore,
      profile: prof,
      curation: cur
    };
    const updated = [newItem, ...historyList].slice(0, 10); // Keep last 10
    setHistoryList(updated);
    localStorage.setItem('resume_tailor_history', JSON.stringify(updated));
  };

  // Restore session from history
  const restoreHistoryItem = (item: HistoryItem) => {
    setProfile(item.profile);
    if (item.curation) {
      setCurationResult(item.curation);
      setEditedMarkdown(item.curation.tailoredResume);
      setOutreachText('');
      
      const initialSelected: Record<number, boolean> = {};
      if (item.curation.bulletSuggestions) {
        item.curation.bulletSuggestions.forEach((_: any, idx: number) => {
          initialSelected[idx] = true;
        });
      }
      setSelectedSuggestions(initialSelected);
      
      setActiveTab('optimizer');
      if (item.jobTitle) {
        setSelectedJob({
          id: -1,
          title: item.jobTitle,
          company: item.company || '',
          url: '',
          description: '',
          matchScore: item.atsScore || 0,
          matchReason: ''
        });
      }
    } else {
      setCurationResult(null);
      setSelectedJob(null);
      setJobs([]);
      setActiveTab('matcher');
    }
  };

  // Handle Drag/Drop File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    setCurationResult(null);
    setSelectedJob(null);
    setJobs([]);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = 'Failed to parse resume';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = `Server error (${res.status}): ${res.statusText || 'Invalid response format'}`;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      setRawResumeText(data.rawText);
      setProfile(data.profile);
      
      // Auto-save initial profile to history
      saveToHistory(data.profile);
      
      // Auto trigger job search
      triggerJobSearch(data.profile);
    } catch (err: any) {
      setError(err.message || 'Error processing file. Please try again.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // Search Jobs matching profile
  const triggerJobSearch = async (targetProfile: Profile) => {
    setSearchingJobs(true);
    setJobs([]);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: targetProfile, domains, excludeDomains }),
      });

      if (!res.ok) {
        throw new Error('Failed to find matching jobs');
      }

      const data = await res.json();
      setJobs(data.matches || []);
    } catch (e) {
      console.error(e);
      // Fallback is handled inside API, but if network error occurs:
      setError('Job search had an issue, showing fallback opportunities.');
    } finally {
      setSearchingJobs(false);
    }
  };

  // Tailor Resume for a job
  const handleTailorResume = async (job: JobMatch | { title: string; company: string; description: string }) => {
    if (!profile) return;
    setCurationLoading(true);
    setCurationResult(null);
    setInterviewQuestions([]);
    setLearningPath([]);
    setCoverTone('Professional');
    setActiveTab('optimizer');

    // Create a normalized selected job display state
    const jobInfo = 'url' in job ? job : { id: -1, title: job.title, company: job.company, url: '', description: job.description, matchScore: 0, matchReason: '' };
    setSelectedJob(jobInfo as JobMatch);

    try {
      const res = await fetch('/api/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          jobDescription: job.description,
          jobTitle: job.title,
          company: job.company,
          creativeMode
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to tailor resume');
      }

      const data = await res.json();
      setCurationResult(data);
      setEditedMarkdown(data.tailoredResume);
      setOutreachText('');
      
      const initialSelected: Record<number, boolean> = {};
      if (data.bulletSuggestions) {
        data.bulletSuggestions.forEach((_: any, idx: number) => {
          initialSelected[idx] = true;
        });
      }
      setSelectedSuggestions(initialSelected);
      
      // Save tailor result in history
      saveToHistory(profile, data, job.title, job.company);
    } catch (e: any) {
      setError(e.message || 'Curation failed.');
    } finally {
      setCurationLoading(false);
    }
  };

  const getFinalResumeText = (): string => {
    if (!curationResult) return '';
    let resume = curationResult.tailoredResume;
    
    curationResult.bulletSuggestions.forEach((sug, idx) => {
      const isSelected = selectedSuggestions[idx] !== false;
      if (!isSelected) {
        resume = resume.replace(sug.suggested, sug.original);
      }
    });
    return resume;
  };

  const downloadAsTxt = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsDocx = (text: string, filename: string) => {
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>Resume</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #111111; }
          h1 { font-size: 18pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; color: #2E4053; }
          h2 { font-size: 14pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; color: #34495E; border-bottom: 1px solid #BDC3C7; padding-bottom: 2px; }
          h3 { font-size: 12pt; font-weight: bold; margin-top: 6pt; margin-bottom: 4pt; }
          p { margin: 0 0 6pt 0; }
          ul { margin: 0 0 6pt 0; padding-left: 20pt; }
          li { margin-bottom: 3pt; }
          strong { font-weight: bold; }
        </style>
      </head>
      <body>
        ${convertMarkdownToHtmlForWord(text)}
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const convertMarkdownToHtmlForWord = (markdown: string): string => {
    const lines = markdown.split('\n');
    let html = '';
    let inList = false;
    
    for (let line of lines) {
      let trimmed = line.trim();
      
      // Header 1
      if (trimmed.startsWith('# ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h1>${parseInlineStyles(trimmed.substring(2))}</h1>`;
      }
      // Header 2
      else if (trimmed.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h2>${parseInlineStyles(trimmed.substring(3))}</h2>`;
      }
      // Header 3
      else if (trimmed.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3>${parseInlineStyles(trimmed.substring(4))}</h3>`;
      }
      // List item
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) { html += '<ul>'; inList = true; }
        const content = parseInlineStyles(trimmed.substring(2));
        html += `<li>${content}</li>`;
      }
      // Empty line
      else if (trimmed === '') {
        if (inList) { html += '</ul>'; inList = false; }
      }
      // Regular text paragraph
      else {
        if (inList) { html += '</ul>'; inList = false; }
        const content = parseInlineStyles(trimmed);
        html += `<p>${content}</p>`;
      }
    }
    
    if (inList) { html += '</ul>'; }
    return html;
  };

  const parseInlineStyles = (text: string): string => {
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return safe
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>');
  };

  const printResume = (text: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `
      <html>
      <head>
        <title>Tailored Resume</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            padding: 40px 50px; 
            color: #2d3748; 
            line-height: 1.5; 
            max-width: 800px;
            margin: 0 auto;
            font-size: 11px;
          }
          h1 { 
            font-size: 24px; 
            font-weight: 700; 
            text-align: center; 
            color: #1a202c; 
            margin-top: 0; 
            margin-bottom: 5px; 
            letter-spacing: -0.5px;
          }
          h1 + p {
            text-align: center;
            font-size: 10.5px;
            color: #718096;
            margin-top: -3px;
            margin-bottom: 24px;
            letter-spacing: 0.2px;
          }
          h2 { 
            font-size: 12px; 
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            color: #1e3a8a; /* Deep corporate blue */
            border-bottom: 1.5px solid #e2e8f0; 
            padding-bottom: 3px; 
            margin-top: 20px; 
            margin-bottom: 8px; 
          }
          h3 { 
            font-size: 11.5px; 
            font-weight: 600; 
            color: #2d3748; 
            margin-top: 10px; 
            margin-bottom: 4px; 
          }
          p { 
            margin: 0 0 6px 0; 
          }
          ul { 
            margin: 0 0 8px 0; 
            padding-left: 18px; 
          }
          li { 
            margin-bottom: 3px; 
          }
          strong { 
            font-weight: 600; 
            color: #1a202c; 
          }
          em {
            font-style: italic;
          }
          @media print {
            body { 
              padding: 0; 
              margin: 0; 
              font-size: 10.5px; 
              color: #000;
            }
            h2 {
              border-bottom-color: #000;
              color: #000;
            }
          }
        </style>
      </head>
      <body>
        ${convertMarkdownToHtmlForWord(text)}
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleToggleBullet = (idx: number, checked: boolean) => {
    setSelectedSuggestions(prev => {
      const updated = {
        ...prev,
        [idx]: checked
      };

      if (curationResult) {
        const sug = curationResult.bulletSuggestions[idx];
        const targetText = checked ? sug.original : sug.suggested;
        const replacementText = checked ? sug.suggested : sug.original;

        setEditedMarkdown(current => {
          if (current.includes(targetText)) {
            return current.replace(targetText, replacementText);
          }
          // Fallback: regenerate base with all current toggles
          let base = curationResult.tailoredResume;
          curationResult.bulletSuggestions.forEach((s, i) => {
            const isSel = i === idx ? checked : (i in updated ? updated[i] : true);
            if (!isSel) {
              base = base.replace(s.suggested, s.original);
            }
          });
          return base;
        });
      }

      return updated;
    });
  };

  const getKeywordTrackerStatus = () => {
    if (!curationResult) return { present: [], missing: [], percentage: 0 };
    const resumeText = (editedMarkdown || '').toLowerCase();

    const present: string[] = [];
    const missing: string[] = [];

    curationResult.keywordGaps.forEach(kw => {
      const cleanKw = kw.toLowerCase().trim();
      if (resumeText.includes(cleanKw)) {
        present.push(kw);
      } else {
        missing.push(kw);
      }
    });

    const total = curationResult.keywordGaps.length;
    const percentage = total > 0 ? Math.round((present.length / total) * 100) : 100;

    return { present, missing, percentage };
  };

  const printCoverLetter = (text: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `
      <html>
      <head>
        <title>Tailored Cover Letter</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            padding: 50px 60px; 
            color: #2d3748; 
            line-height: 1.6; 
            max-width: 800px;
            margin: 0 auto;
            font-size: 12px;
          }
          p { 
            margin: 0 0 12px 0; 
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <div style="font-size: 11px; color: #718096; margin-bottom: 25px; font-weight: 500;">
          Date Generated: ${new Date().toLocaleDateString()}
        </div>
        <div>
          ${text.split('\n').map(p => p.trim() ? `<p>${parseInlineStyles(p)}</p>` : '').join('')}
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleGenerateOutreach = async () => {
    if (!profile || !selectedJob) return;
    setGeneratingOutreach(true);
    setError(null);
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          jobTitle: selectedJob.title,
          company: selectedJob.company,
          style: outreachStyle,
          tone: outreachTone
        })
      });
      if (!res.ok) throw new Error('Failed to generate outreach pitch');
      const data = await res.json();
      setOutreachText(data.message);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating outreach message.');
    } finally {
      setGeneratingOutreach(false);
    }
  };

  const handleImportJobFromUrl = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setError(null);
    try {
      const res = await fetch('/api/import-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl.trim() }),
      });
      
      if (!res.ok) {
        let errMsg = 'Failed to import job details';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = `Server error (${res.status}): ${res.statusText || 'Invalid response format'}`;
        }
        throw new Error(errMsg);
      }
      
      const data = await res.json();
      if (data.success && data.job) {
        setCustomJobTitle(data.job.title);
        setCustomCompany(data.job.company);
        setCustomJobDesc(data.job.description);
        setScrapeUrl('');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error scraping job portal. Please paste details manually.');
    } finally {
      setScraping(false);
    }
  };

  const handleRegenerateCoverLetter = async (newTone: string) => {
    if (!profile || !selectedJob) return;
    setGeneratingCoverTone(true);
    setCoverTone(newTone);
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          jobTitle: selectedJob.title,
          company: selectedJob.company,
          jobDescription: selectedJob.description,
          tone: newTone
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to generate cover letter');
      }
      const data = await res.json();
      if (data.success && curationResult) {
        setCurationResult({
          ...curationResult,
          coverLetter: data.coverLetter
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error regenerating cover letter.');
    } finally {
      setGeneratingCoverTone(false);
    }
  };

  const handleGenerateInterviewQuestions = async () => {
    if (!profile || !selectedJob) return;
    setLoadingInterview(true);
    setInterviewQuestions([]);
    try {
      const res = await fetch('/api/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          jobTitle: selectedJob.title,
          company: selectedJob.company,
          jobDescription: selectedJob.description
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to generate interview questions');
      }
      const data = await res.json();
      setInterviewQuestions(data.questions || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating interview preparation.');
    } finally {
      setLoadingInterview(false);
    }
  };

  const handleGenerateLearningPath = async () => {
    if (!curationResult || !selectedJob) return;
    setLoadingLearningPath(true);
    setLearningPath([]);
    try {
      const res = await fetch('/api/learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordGaps: curationResult.keywordGaps,
          jobTitle: selectedJob.title
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to generate learning roadmap');
      }
      const data = await res.json();
      setLearningPath(data.roadmap || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating learning path.');
    } finally {
      setLoadingLearningPath(false);
    }
  };

  const copyToClipboard = (text: string, type: 'resume' | 'cover') => {
    navigator.clipboard.writeText(text);
    if (type === 'resume') {
      setCopiedResume(true);
      setTimeout(() => setCopiedResume(false), 2000);
    } else {
      setCopiedCoverLetter(true);
      setTimeout(() => setCopiedCoverLetter(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-indigo-400 bg-clip-text text-transparent">
              ElevateCV
            </h1>
            <p className="text-xs text-gray-400">Agentic Resume Curator & Matcher</p>
          </div>
        </div>
        
        {profile && (
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{profile.name}</p>
              <p className="text-xs text-indigo-400">{profile.title}</p>
            </div>
            <label className="btn-secondary text-sm py-1.5 px-3 cursor-pointer flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Upload New</span>
              <input type="file" onChange={handleFileUpload} accept=".pdf,.docx,.txt" className="hidden" />
            </label>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {error && (
          <div className="mb-6 p-4 glass-panel border-red-500/30 bg-red-950/20 rounded-xl flex items-start space-x-3 text-red-200 text-sm animate-fade-in">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Error occurred</p>
              <p>{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold px-1">&times;</button>
          </div>
        )}

        {/* Initial Upload Screen */}
        {!profile && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 max-w-xl mx-auto text-center animate-fade-in">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl transform scale-150" />
              <div className="relative bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
                <Upload className="h-12 w-12 text-indigo-500 mx-auto mb-2 animate-bounce" />
                <p className="text-xs text-indigo-400 font-mono">PDF, DOCX, TXT UP TO 10MB</p>
              </div>
            </div>

            <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              Optimize your resume for your dream job
            </h2>
            <p className="text-gray-400 mb-8 max-w-md">
              Upload your resume to automatically extract your skills, find matching active job openings, and tailor your profile to pass applicant tracking systems.
            </p>

            <label className="btn-primary w-full py-4 rounded-xl flex items-center justify-center space-x-3 cursor-pointer text-lg font-semibold shadow-indigo-600/30">
              <FileText className="h-5 w-5" />
              <span>Select Resume Document</span>
              <input type="file" onChange={handleFileUpload} accept=".pdf,.docx,.txt" className="hidden" />
            </label>

            {historyList.length > 0 && (
              <div className="w-full mt-10 text-left">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                  <History className="h-3.5 w-3.5 mr-1" />
                  Recent Sessions
                </h3>
                <div className="space-y-2">
                  {historyList.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => restoreHistoryItem(item)}
                      className="w-full text-left p-3 glass-card-interactive flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.title} {item.jobTitle && `• Tailored for ${item.jobTitle}`}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {item.atsScore && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                            {item.atsScore}% ATS
                          </span>
                        )}
                        <ArrowRight className="h-4 w-4 text-gray-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full border-4 border-indigo-900 border-t-indigo-500 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Parsing your resume...</h3>
            <p className="text-sm text-gray-400 max-w-xs text-center">
              Our AI agent is extracting skills, analyzing experiences, and scanning for relevant opportunities.
            </p>
          </div>
        )}

        {/* Main Dashboard Layout */}
        {profile && !loading && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            
            {/* Left Column: Applicant Profile Summary (Takes 4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel p-6 sticky top-24">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white leading-tight">{profile.name}</h2>
                    <p className="text-sm text-indigo-400 font-medium">{profile.title}</p>
                  </div>
                  <span className="p-1 bg-indigo-500/10 text-indigo-400 rounded-md">
                    <FileText className="h-5 w-5" />
                  </span>
                </div>

                {profile.summary && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Professional Summary</h4>
                    <p className="text-sm text-gray-300 leading-relaxed bg-gray-900/30 p-3 rounded-lg border border-gray-800/40">
                      {profile.summary}
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Technical Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((skill, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 font-medium border border-gray-700/30">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Work History</h4>
                  <div className="space-y-4">
                    {profile.experience.map((exp, idx) => (
                      <div key={idx} className="relative pl-4 border-l border-gray-800">
                        <div className="absolute left-0 top-1.5 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-500" />
                        <h5 className="text-sm font-semibold text-white leading-tight">{exp.role}</h5>
                        <p className="text-xs text-gray-400 mb-1">{exp.company} • {exp.duration}</p>
                        {exp.bullets && exp.bullets.length > 0 && (
                          <ul className="text-xs text-gray-300 list-disc pl-4 space-y-1 mt-1.5 hidden md:block">
                            {exp.bullets.slice(0, 2).map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                            {exp.bullets.length > 2 && <li className="text-gray-500 list-none italic">+{exp.bullets.length - 2} more bullets</li>}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {profile.education && profile.education.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Education</h4>
                    {profile.education.map((edu, i) => (
                      <p key={i} className="text-xs text-gray-300">{edu}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Dynamic Tabs and Curate Workflow (Takes 8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-800">
                <button
                  onClick={() => setActiveTab('matcher')}
                  className={`tab-button flex items-center space-x-2 ${activeTab === 'matcher' ? 'active' : ''}`}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Job Matcher</span>
                </button>
                <button
                  onClick={() => setActiveTab('optimizer')}
                  className={`tab-button flex items-center space-x-2 ${activeTab === 'optimizer' ? 'active' : ''}`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>CV Tailoring Report</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`tab-button flex items-center space-x-2 ${activeTab === 'history' ? 'active' : ''}`}
                >
                  <History className="h-4 w-4" />
                  <span>History</span>
                </button>
              </div>

              {/* Tab Content 1: Job Matcher */}
              {activeTab === 'matcher' && (
                <div className="space-y-6">
                  
                  {/* Optimization Preference */}
                  <div className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="creative-mode-toggle"
                        checked={creativeMode}
                        onChange={(e) => setCreativeMode(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-800 text-indigo-600 focus:ring-indigo-500 bg-gray-900 cursor-pointer mt-0.5"
                      />
                      <div>
                        <label htmlFor="creative-mode-toggle" className="text-sm font-semibold text-white cursor-pointer select-none">
                          Allow Creative Resume Tailoring
                        </label>
                        <p className="text-xs text-gray-400">
                          When unchecked (default: minimal), revisions are kept as close to your original text as possible. Checked will enable more creative phrasing and structuring.
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold self-start sm:self-center ${creativeMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-gray-800 text-gray-400'}`}>
                      {creativeMode ? "Creative Mode" : "Minimal Mode"}
                    </span>
                  </div>
                  
                  {/* Domains and Exclusions Preference Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Target Domains Preference */}
                    <div className="glass-panel p-6 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-white mb-1">Target Companies & Portals</h3>
                        <p className="text-xs text-gray-400">
                          Restrict web-matching searches to specific career portals. If left empty, search runs globally.
                        </p>
                      </div>
                      
                      {/* Domain Chips */}
                      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                        {domains.map((dom, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5 font-mono">
                            <span>{dom}</span>
                            <button
                              onClick={() => setDomains(domains.filter((d) => d !== dom))}
                              className="hover:text-red-400 text-sm font-bold focus:outline-none"
                              title="Remove"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                        {domains.length === 0 && (
                          <span className="text-xs text-gray-500 italic">No restrictions configured. Searching web globally.</span>
                        )}
                      </div>
                      
                      {/* Domain Add Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newDomain.trim() && !domains.includes(newDomain.trim())) {
                                setDomains([...domains, newDomain.trim()]);
                                setNewDomain('');
                              }
                            }
                          }}
                          placeholder="e.g. careers.microsoft.com"
                          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                        />
                        <button
                          onClick={() => {
                            if (newDomain.trim() && !domains.includes(newDomain.trim())) {
                              setDomains([...domains, newDomain.trim()]);
                              setNewDomain('');
                            }
                          }}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Exclude Domains Preference */}
                    <div className="glass-panel p-6 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-white mb-1">Exclude Companies & Portals</h3>
                        <p className="text-xs text-gray-400">
                          Block specific domains from appearing in matching results (e.g., current employer).
                        </p>
                      </div>
                      
                      {/* Exclude Chips */}
                      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                        {excludeDomains.map((dom, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-300 border border-red-500/20 flex items-center gap-1.5 font-mono">
                            <span>{dom}</span>
                            <button
                              onClick={() => setExcludeDomains(excludeDomains.filter((d) => d !== dom))}
                              className="hover:text-red-400 text-sm font-bold focus:outline-none"
                              title="Remove"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                        {excludeDomains.length === 0 && (
                          <span className="text-xs text-gray-500 italic">No exclusions configured.</span>
                        )}
                      </div>
                      
                      {/* Exclude Add Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newExcludeDomain}
                          onChange={(e) => setNewExcludeDomain(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newExcludeDomain.trim() && !excludeDomains.includes(newExcludeDomain.trim())) {
                                setExcludeDomains([...excludeDomains, newExcludeDomain.trim()]);
                                setNewExcludeDomain('');
                              }
                            }
                          }}
                          placeholder="e.g. metacareers.com"
                          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                        />
                        <button
                          onClick={() => {
                            if (newExcludeDomain.trim() && !excludeDomains.includes(newExcludeDomain.trim())) {
                              setExcludeDomains([...excludeDomains, newExcludeDomain.trim()]);
                              setNewExcludeDomain('');
                            }
                          }}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Job Search Header */}
                  <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">Explore Job Openings</h3>
                      <p className="text-sm text-gray-400">
                        Scan the web agentically for roles matching your skills and current title.
                      </p>
                    </div>
                    <button
                      onClick={() => triggerJobSearch(profile)}
                      disabled={searchingJobs}
                      className="btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Search className="h-4 w-4" />
                      <span>{searchingJobs ? 'Scanning Web...' : 'Find Matches'}</span>
                    </button>
                  </div>

                  {/* Custom Job Input Panel */}
                  <div className="glass-panel p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-900 pb-3">
                      <h4 className="text-sm font-bold text-white">Custom Job Posting</h4>
                      <p className="text-[10px] text-gray-400">Paste details manually or import them from a URL</p>
                    </div>

                    {/* Import URL Row */}
                    <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-900 space-y-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase">Import from Job URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={scrapeUrl}
                          onChange={(e) => setScrapeUrl(e.target.value)}
                          placeholder="Paste URL (e.g. LinkedIn, Greenhouse, Google Careers...)"
                          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          onClick={handleImportJobFromUrl}
                          disabled={scraping || !scrapeUrl.trim()}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center disabled:opacity-50"
                        >
                          {scraping ? 'Importing...' : 'Import'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Job Title</label>
                        <input
                          type="text"
                          value={customJobTitle}
                          onChange={(e) => setCustomJobTitle(e.target.value)}
                          placeholder="e.g. Frontend Engineer"
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Company</label>
                        <input
                          type="text"
                          value={customCompany}
                          onChange={(e) => setCustomCompany(e.target.value)}
                          placeholder="e.g. Google"
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Job Description Requirements</label>
                      <textarea
                        rows={4}
                        value={customJobDesc}
                        onChange={(e) => setCustomJobDesc(e.target.value)}
                        placeholder="Paste the full job posting details here..."
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none font-sans"
                      />
                    </div>
                    <button
                      onClick={() => handleTailorResume({ title: customJobTitle, company: customCompany, description: customJobDesc })}
                      disabled={!customJobTitle || !customJobDesc || curationLoading}
                      className="btn-secondary w-full flex items-center justify-center space-x-2 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Optimize for This Custom Job</span>
                    </button>
                  </div>

                  {/* Jobs List */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {searchingJobs ? 'Searching for matching opportunities...' : `${jobs.length} Matches Found`}
                    </h4>

                    {searchingJobs && (
                      <div className="py-12 text-center glass-panel">
                        <div className="h-8 w-8 rounded-full border-2 border-indigo-900 border-t-indigo-400 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-gray-400">Searching job directories via Tavily Agent...</p>
                      </div>
                    )}

                    {!searchingJobs && jobs.map((job) => (
                      <div key={job.id} className="glass-panel p-5 space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="text-lg font-bold text-white leading-snug">{job.title}</h4>
                            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <span>{job.company}</span>
                              {job.url && (
                                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center">
                                  <Globe className="h-3 w-3 ml-0.5" />
                                </a>
                              )}
                            </p>
                          </div>
                          
                          {/* Score Badge */}
                          <div className={`shrink-0 flex flex-col items-center justify-center p-2 rounded-xl text-center min-w-[70px] ${
                            job.matchScore >= 80 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : job.matchScore >= 60 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-gray-800 text-gray-400 border border-gray-700/20'
                          }`}>
                            <span className="text-2xl font-bold font-mono">{job.matchScore}%</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider">Fit</span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                          {job.description || job.matchReason}
                        </p>

                        {job.matchReason && (
                          <div className="bg-indigo-950/20 border border-indigo-500/10 p-3 rounded-lg text-xs text-indigo-300">
                            <span className="font-bold">Match Analysis:</span> {job.matchReason}
                          </div>
                        )}

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleTailorResume(job)}
                            disabled={curationLoading}
                            className="btn-primary py-1.5 px-4 text-sm flex items-center space-x-1.5"
                          >
                            <span>Tailor Resume</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab Content 2: Resume Optimizer & Curation Report */}
              {activeTab === 'optimizer' && (
                <div className="space-y-6">
                  {curationLoading && (
                    <div className="py-20 text-center glass-panel">
                      <div className="h-10 w-10 rounded-full border-4 border-indigo-900 border-t-indigo-400 animate-spin mx-auto mb-4" />
                      <h4 className="text-lg font-bold text-white mb-1">Tailoring resume to {selectedJob?.title || 'Target Job'}...</h4>
                      <p className="text-sm text-gray-400 max-w-md mx-auto">
                        Evaluating keyword gaps, rephrasing experiences, generating cover letter and ATS scoring optimization report.
                      </p>
                    </div>
                  )}

                  {!curationLoading && !curationResult && (
                    <div className="py-16 text-center glass-panel text-gray-400">
                      <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm">Select a job matching your skills and click "Tailor Resume" to view the optimization report.</p>
                    </div>
                  )}

                  {!curationLoading && curationResult && selectedJob && (
                    <div className="space-y-6">
                      
                      {/* Job Header */}
                      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Optimized for</p>
                          <h3 className="text-2xl font-bold text-white leading-tight">{selectedJob.title}</h3>
                          <p className="text-sm text-gray-400">{selectedJob.company}</p>
                        </div>

                        {/* ATS Score Radial */}
                        <div className="flex items-center space-x-3 bg-gray-900/60 p-3 rounded-2xl border border-gray-800">
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold font-mono ${
                            curationResult.atsScore >= 80 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : curationResult.atsScore >= 60 
                                ? 'bg-amber-500/10 text-amber-400' 
                                : 'bg-red-500/10 text-red-400'
                          }`}>
                            {curationResult.atsScore}%
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">ATS Score</p>
                            <p className="text-[10px] text-gray-400">Optimized Match Rating</p>
                          </div>
                        </div>
                      </div>

                      {/* Keyword Gaps & Real-Time ATS Tracker Section */}
                      {(() => {
                        const { present, missing, percentage } = getKeywordTrackerStatus();
                        return (
                          <div className="glass-panel p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-bold text-white flex items-center">
                                  <AlertCircle className="h-4 w-4 text-amber-500 mr-1.5" />
                                  Real-Time Keyword & Skill Gap Tracker
                                </h4>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Integrate missing skills into the editor below to dynamically optimize your match index.
                                </p>
                              </div>
                              
                              <div className="flex items-center space-x-2 bg-gray-900/60 py-1.5 px-3 rounded-xl border border-gray-800 shrink-0">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Keyword Alignment:</span>
                                <span className={`text-xs font-mono font-bold ${
                                  percentage >= 80 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {percentage}%
                                </span>
                              </div>
                            </div>

                            {/* Alignment Progress Bar */}
                            <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-800">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {present.map((keyword, i) => (
                                <span key={`pres-${i}`} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center">
                                  <Check className="h-3 w-3 mr-1 shrink-0" />
                                  {keyword}
                                </span>
                              ))}
                              {missing.map((keyword, i) => (
                                <span key={`miss-${i}`} className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium flex items-center">
                                  + {keyword}
                                </span>
                              ))}
                              {curationResult.keywordGaps.length === 0 && (
                                <span className="text-xs text-gray-400 italic">No critical keyword gaps found! Exceptional resume alignment.</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Bullet Rephrasing Suggestions */}
                      <div className="glass-panel p-6">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mr-1.5" />
                          Experience Bullet-by-Bullet Alignment
                        </h4>
                        <div className="space-y-4">
                          {curationResult.bulletSuggestions.map((sug, i) => (
                            <div key={i} className={`p-4 rounded-xl border space-y-2 text-xs transition-all duration-200 ${
                              selectedSuggestions[i] !== false 
                                ? 'bg-gray-950/45 border-gray-800' 
                                : 'bg-gray-900/10 border-gray-800/30 opacity-70'
                            }`}>
                              
                              {/* Apply Toggle */}
                              <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-900">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`bullet-sug-${i}`}
                                    checked={selectedSuggestions[i] !== false}
                                    onChange={(e) => handleToggleBullet(i, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-800 text-indigo-600 focus:ring-indigo-500 bg-gray-900 cursor-pointer"
                                  />
                                  <label htmlFor={`bullet-sug-${i}`} className="font-bold text-gray-300 text-[10px] cursor-pointer uppercase tracking-wider select-none">
                                    {selectedSuggestions[i] !== false ? "Apply Tailored Wording" : "Keep Original Wording"}
                                  </label>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                                  selectedSuggestions[i] !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {selectedSuggestions[i] !== false ? "Applied" : "Original"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <span className="font-bold text-red-400 uppercase tracking-widest text-[9px]">Original Resume Bullet</span>
                                  <p className="text-gray-400 leading-relaxed italic">"{sug.original}"</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-bold text-emerald-400 uppercase tracking-widest text-[9px]">Suggested Optimization</span>
                                  <p className="text-white leading-relaxed font-medium bg-emerald-950/10 border border-emerald-500/10 p-2 rounded">
                                    "{sug.suggested}"
                                  </p>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-gray-900 text-gray-400">
                                <span className="font-bold text-indigo-400">Strategy:</span> {sug.explanation}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tailored Outputs Container */}
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        
                        {/* Resume Text Area */}
                        <div className="glass-panel p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-900 pb-3">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center">
                                <FileCode className="h-4 w-4 text-indigo-400 mr-1.5" />
                                Tailored Resume Draft
                              </h4>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Includes only the accepted suggestions above
                              </p>
                            </div>
                            
                            {/* Mode Selectors */}
                            <div className="flex items-center space-x-3">
                              <div className="bg-gray-900 p-0.5 rounded-lg border border-gray-800 flex">
                                <button
                                  onClick={() => setResumePreviewMode('preview')}
                                  className={`px-3 py-1 text-[11px] rounded-md transition-all font-semibold ${
                                    resumePreviewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                                  }`}
                                >
                                  A4 Document
                                </button>
                                <button
                                  onClick={() => setResumePreviewMode('markdown')}
                                  className={`px-3 py-1 text-[11px] rounded-md transition-all font-semibold ${
                                    resumePreviewMode === 'markdown' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                                  }`}
                                >
                                  Raw Markdown
                                </button>
                              </div>
                              <button
                                onClick={() => copyToClipboard(getFinalResumeText(), 'resume')}
                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                              >
                                {copiedResume ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                <span>{copiedResume ? 'Copied!' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>
                          
                          {resumePreviewMode === 'markdown' ? (
                            <div className="bg-gray-950 p-2 rounded-xl border border-gray-900">
                              <textarea
                                value={editedMarkdown}
                                onChange={(e) => setEditedMarkdown(e.target.value)}
                                className="w-full h-[450px] bg-gray-950 text-indigo-200 font-mono text-xs p-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none resize-none animate-fade-in"
                                placeholder="Edit resume markdown here..."
                              />
                            </div>
                          ) : (
                            <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-200 text-gray-800 overflow-y-auto max-h-[450px] select-text">
                              <div 
                                className="font-sans leading-relaxed text-[11px] text-gray-800 space-y-4"
                                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
                              >
                                <style>{`
                                  .preview-resume h1 { font-size: 20px; font-weight: 700; text-align: center; color: #1a202c; margin-top: 0; margin-bottom: 4px; letter-spacing: -0.5px; }
                                  .preview-resume h1 + p { text-align: center; font-size: 10px; color: #718096; margin-top: -3px; margin-bottom: 18px; }
                                  .preview-resume h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-top: 15px; margin-bottom: 6px; }
                                  .preview-resume h3 { font-size: 11px; font-weight: 600; color: #2d3748; margin-top: 8px; margin-bottom: 3px; }
                                  .preview-resume p { margin: 0 0 5px 0; }
                                  .preview-resume ul { margin: 0 0 6px 0; padding-left: 15px; list-style-type: disc; }
                                  .preview-resume li { margin-bottom: 2px; }
                                  .preview-resume strong { font-weight: 600; color: #1a202c; }
                                `}</style>
                                <div className="preview-resume" dangerouslySetInnerHTML={{ __html: convertMarkdownToHtmlForWord(editedMarkdown || getFinalResumeText()) }} />
                              </div>
                            </div>
                          )}

                          {/* Downloads Row */}
                          <div className="pt-2 border-t border-gray-900 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-400 mr-2">Download tailored resume as:</span>
                            <button
                              onClick={() => downloadAsTxt(editedMarkdown || getFinalResumeText(), `${profile.name.replace(/\s+/g, '_')}_Tailored_Resume.txt`)}
                              className="btn-secondary text-[11px] py-1.5 px-3"
                            >
                              TXT File
                            </button>
                            <button
                              onClick={() => downloadAsDocx(editedMarkdown || getFinalResumeText(), `${profile.name.replace(/\s+/g, '_')}_Tailored_Resume.doc`)}
                              className="btn-secondary text-[11px] py-1.5 px-3"
                            >
                              Word DOCX
                            </button>
                            <button
                              onClick={() => printResume(editedMarkdown || getFinalResumeText())}
                              className="btn-primary text-[11px] py-1.5 px-3"
                            >
                              PDF / Print
                            </button>
                          </div>
                        </div>

                        {/* Cover Letter Area */}
                        <div className="glass-panel p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-900 pb-3">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center">
                                <FileText className="h-4 w-4 text-indigo-400 mr-1.5" />
                                Generated Cover Letter Draft
                              </h4>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Customize tone style adjustments
                              </p>
                            </div>
                            
                            {/* Tone Selector & Regenerate */}
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={coverTone}
                                onChange={(e) => handleRegenerateCoverLetter(e.target.value)}
                                disabled={generatingCoverTone}
                                className="bg-gray-900 border border-gray-800 rounded-lg p-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                              >
                                <option value="Professional">Professional (Default)</option>
                                <option value="Confident & Bold">Confident & Bold</option>
                                <option value="Friendly & Conversational">Friendly & Conversational</option>
                                <option value="Direct & Brief">Direct & Brief</option>
                              </select>
                              
                              <button
                                onClick={() => copyToClipboard(curationResult.coverLetter, 'cover')}
                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 ml-2"
                              >
                                {copiedCoverLetter ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                <span>{copiedCoverLetter ? 'Copied!' : 'Copy Letter'}</span>
                              </button>
                            </div>
                          </div>
                          
                          {generatingCoverTone ? (
                            <div className="bg-gray-950 p-6 rounded-xl border border-gray-900 text-xs text-gray-400 flex flex-col items-center justify-center space-y-2 h-[200px]">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                              <span>Regenerating cover letter in {coverTone} tone...</span>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-gray-950 p-6 rounded-xl border border-gray-900 max-h-[400px] overflow-y-auto font-sans text-sm leading-relaxed text-gray-200 whitespace-pre-wrap select-text">
                                {curationResult.coverLetter}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-900">
                                <span className="text-xs text-gray-400 mr-2">Download cover letter as:</span>
                                <button
                                  onClick={() => downloadAsTxt(curationResult.coverLetter, `${profile.name.replace(/\s+/g, '_')}_Tailored_CoverLetter.txt`)}
                                  className="btn-secondary text-[11px] py-1.5 px-3"
                                >
                                  TXT File
                                </button>
                                <button
                                  onClick={() => downloadAsDocx(curationResult.coverLetter, `${profile.name.replace(/\s+/g, '_')}_Tailored_CoverLetter.doc`)}
                                  className="btn-secondary text-[11px] py-1.5 px-3"
                                >
                                  Word DOCX
                                </button>
                                <button
                                  onClick={() => printCoverLetter(curationResult.coverLetter)}
                                  className="btn-primary text-[11px] py-1.5 px-3"
                                >
                                  PDF / Print
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Recruiter Outreach Manager */}
                        <div className="glass-panel p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-900 pb-3">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center">
                                <Globe className="h-4 w-4 text-indigo-400 mr-1.5" />
                                Recruiter Cold Outreach Generator
                              </h4>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Generate personalized outreach pitches for hiring managers
                              </p>
                            </div>
                            
                            {/* Format & Tone Selection */}
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={outreachStyle}
                                onChange={(e) => setOutreachStyle(e.target.value as any)}
                                className="bg-gray-900 border border-gray-800 rounded-lg p-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                              >
                                <option value="linkedin">LinkedIn Connection Request (300 char)</option>
                                <option value="email">Cold Email Pitch</option>
                              </select>
                              
                              <select
                                value={outreachTone}
                                onChange={(e) => setOutreachTone(e.target.value as any)}
                                className="bg-gray-900 border border-gray-800 rounded-lg p-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                              >
                                <option value="professional">Professional Tone</option>
                                <option value="short_direct">Direct & Concise</option>
                                <option value="bold">Confident & Bold</option>
                              </select>

                              <button
                                onClick={handleGenerateOutreach}
                                disabled={generatingOutreach}
                                className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                              >
                                {generatingOutreach ? 'Generating...' : 'Generate Pitch'}
                              </button>
                            </div>
                          </div>

                          {generatingOutreach ? (
                            <div className="bg-gray-950 p-6 rounded-xl border border-gray-900 text-xs text-gray-400 flex flex-col items-center justify-center space-y-2 h-[150px]">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                              <span>Drafting your outreach pitch...</span>
                            </div>
                          ) : outreachText ? (
                            <div className="space-y-3">
                              <div className="bg-gray-950 p-6 rounded-xl border border-gray-900 max-h-[300px] overflow-y-auto font-sans text-sm leading-relaxed text-gray-200 whitespace-pre-wrap select-text">
                                {outreachText}
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(outreachText);
                                    setCopiedOutreach(true);
                                    setTimeout(() => setCopiedOutreach(false), 2000);
                                  }}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                                >
                                  {copiedOutreach ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                  <span>{copiedOutreach ? 'Copied!' : 'Copy Pitch'}</span>
                                </button>
                                <span className="text-gray-600">|</span>
                                <button
                                  onClick={() => downloadAsTxt(outreachText, `${selectedJob.company.replace(/\s+/g, '_')}_Recruiter_Pitch.txt`)}
                                  className="text-xs text-gray-400 hover:text-white"
                                >
                                  Download TXT
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-8 text-center text-gray-500 italic text-xs">
                              Select format and click "Generate Pitch" to create recruiter outreach text.
                            </div>
                          )}
                        </div>

                        {/* AI Interview Preparation Trainer */}
                        <div className="glass-panel p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-900 pb-3">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center">
                                <Sparkles className="h-4 w-4 text-emerald-400 mr-1.5 animate-pulse" />
                                AI Interview Preparation Trainer
                              </h4>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Practice targeted behavioral and technical questions based on your qualifications overlap
                              </p>
                            </div>
                            {interviewQuestions.length === 0 && (
                              <button
                                onClick={handleGenerateInterviewQuestions}
                                disabled={loadingInterview}
                                className="btn-primary text-xs py-1.5 px-3 flex items-center space-x-1.5 disabled:opacity-50"
                              >
                                {loadingInterview ? 'Generating Prep...' : 'Generate Practice Q&A'}
                              </button>
                            )}
                          </div>

                          {loadingInterview && (
                            <div className="bg-gray-950 p-6 rounded-xl border border-gray-900 text-xs text-gray-400 flex flex-col items-center justify-center space-y-2 h-[200px]">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                              <span>Recruiter AI is formulating practice questions...</span>
                            </div>
                          )}

                          {!loadingInterview && interviewQuestions.length > 0 && (
                            <div className="space-y-3">
                              {interviewQuestions.map((q, idx) => (
                                <div key={idx} className="bg-gray-950/50 rounded-xl border border-gray-800 overflow-hidden">
                                  <button
                                    onClick={() => setOpenQuestionId(openQuestionId === idx ? null : idx)}
                                    className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-900/40 transition"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase self-start mt-0.5 ${
                                        q.type === 'technical' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                                      }`}>
                                        {q.type}
                                      </span>
                                      <span className="text-xs text-white font-semibold leading-snug">{q.question}</span>
                                    </div>
                                    <span className="text-gray-500 text-xs ml-2">{openQuestionId === idx ? '▲' : '▼'}</span>
                                  </button>

                                  {openQuestionId === idx && (
                                    <div className="p-4 bg-gray-950 border-t border-gray-900 space-y-3 text-xs leading-relaxed">
                                      <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-800/40">
                                        <span className="font-bold text-indigo-400 uppercase tracking-widest text-[9px] block mb-1">Recruiter Rationale</span>
                                        <p className="text-gray-300 font-medium italic">"{q.rationale}"</p>
                                      </div>
                                      
                                      <div className="bg-emerald-950/5 p-3 rounded-lg border border-emerald-500/5">
                                        <span className="font-bold text-emerald-400 uppercase tracking-widest text-[9px] block mb-1">Suggested STAR Answer Strategy</span>
                                        <p className="text-gray-200 font-medium whitespace-pre-wrap">{q.framework}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Skills Gap Learning Roadmap */}
                        <div className="glass-panel p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-900 pb-3">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center">
                                <Sparkles className="h-4 w-4 text-amber-400 mr-1.5" />
                                Custom Learning Roadmap
                              </h4>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Tailored tutorials, learning timeframes, and mini projects to bridge identified keyword gaps
                              </p>
                            </div>
                            {learningPath.length === 0 && curationResult.keywordGaps.length > 0 && (
                              <button
                                onClick={handleGenerateLearningPath}
                                disabled={loadingLearningPath}
                                className="btn-secondary text-xs py-1.5 px-3 flex items-center space-x-1.5 disabled:opacity-50"
                              >
                                {loadingLearningPath ? 'Building Roadmap...' : 'Build Learning Path'}
                              </button>
                            )}
                          </div>

                          {loadingLearningPath && (
                            <div className="bg-gray-950 p-6 rounded-xl border border-gray-900 text-xs text-gray-400 flex flex-col items-center justify-center space-y-2 h-[200px]">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                              <span>Formulating skill milestones and learning pathways...</span>
                            </div>
                          )}

                          {curationResult.keywordGaps.length === 0 && (
                            <div className="text-xs text-gray-400 italic bg-gray-950/30 p-4 rounded-xl border border-gray-800/40 text-center">
                              No skill gaps to bridge! Perfect alignment with job description.
                            </div>
                          )}

                          {!loadingLearningPath && learningPath.length > 0 && (
                            <div className="space-y-4">
                              {learningPath.map((item, idx) => (
                                <div key={idx} className="bg-gray-950/40 p-4 rounded-xl border border-gray-800 space-y-3 text-xs">
                                  <div className="flex justify-between items-center border-b border-gray-900 pb-2 flex-wrap gap-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                                      <span className="font-bold text-white text-[13px]">{item.skill}</span>
                                    </div>
                                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 uppercase">
                                      Est: {item.timeframe}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 leading-relaxed">
                                    <div className="space-y-1.5">
                                      <div>
                                        <span className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">Concept & Focus</span>
                                        <p className="text-gray-300 font-medium">{item.concept}</p>
                                      </div>
                                      <div>
                                        <span className="font-bold text-indigo-400 uppercase tracking-widest text-[9px]">Recommended Resources</span>
                                        <p className="text-gray-300 font-medium whitespace-pre-wrap">{item.resources}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-amber-950/5 p-3 rounded-lg border border-amber-500/5 h-fit">
                                      <span className="font-bold text-amber-400 uppercase tracking-widest text-[9px] block mb-1">Portfolio Project Idea</span>
                                      <p className="text-gray-200 font-medium">{item.project}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content 3: Session History */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">Historical Optimizations</h3>
                  <p className="text-sm text-gray-400">
                    Access parsed profiles and customized resumes stored in local session memory.
                  </p>

                  <div className="space-y-3">
                    {historyList.map((item) => (
                      <div key={item.id} className="glass-panel p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">{item.date}</span>
                            {item.jobTitle && (
                              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                                CV Tailored
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-white mt-1 leading-tight">{item.name}</h4>
                          <p className="text-xs text-gray-400">
                            {item.title} {item.jobTitle && `• Optimized for ${item.jobTitle} (${item.company})`}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {item.atsScore && (
                            <div className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {item.atsScore}% Score
                            </div>
                          )}
                          <button
                            onClick={() => restoreHistoryItem(item)}
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center space-x-1"
                          >
                            <span>Restore</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {historyList.length === 0 && (
                      <div className="py-12 text-center glass-panel text-gray-500 text-sm">
                        No history records found. Upload a resume to begin tracking your curations.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
