// src/utils/trackLoader.js

// 1. Import all 7 JSON files
// Adjust the filenames if they differ from track-1.json, track-2.json, etc.
import track1 from '../data/track-json/track_cloud_devops_security.json';
import track2 from '../data/track-json/track_data_analyst_scientist_ai_ml.json';
import track3 from '../data/track-json/track_design_cae_manufacturing.json';
import track4 from '../data/track-json/track_ev_power_automation.json';
import track5 from '../data/track-json/track_full_stack_developer.json';
import track6 from '../data/track-json/track_se_sd.json';
import track7 from '../data/track-json/track_vlsi_semiconductor.json';
import track8 from '../data/track-json/track_embedded_system_iot.json';

// Group them into an array for processing
const rawTracks = [track1, track2, track3, track4, track5, track6, track7, track8];

// 2. Helper function to create clean, URL-friendly slugs
export const generateSlug = (name) => {
  if (!name) return 'unknown-track';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/(^-|-$)+/g, '');   // Trim leading and trailing hyphens
};

// 3. Pre-process the array to inject the slug into the full data payload
const tracksWithSlugs = rawTracks.map(track => ({
  ...track,
  slug: generateSlug(track.track_name)
}));

export const getAllTracksSummary = () => {
  return tracksWithSlugs.map(track => {
    // Because your schema is polymorphic (Type A, B, C), we extract a primary 
    // focus from the first semester, or provide a logical fallback.
    const firstSemester = track.semesters?.[0];
    const primaryFocus = firstSemester?.focus 
      || firstSemester?.semester_title 
      || 'Comprehensive Training';

    return {
      track_name: track.track_name,
      slug: track.slug,
      total_semesters: track.semesters?.length || 0,
      primary_focus: primaryFocus,
      preferred_branch: getPreferredBranchForTrack(track.slug)
    };
  });
};

// 5. Function for the 'Track Details' page (Returns the deeply nested JSON object)
export const getTrackBySlug = (slug) => {
  const foundTrack = tracksWithSlugs.find(track => track.slug === slug);
  return foundTrack || null; // Returns null if someone types a bad URL
};

// 6. Branch and Track Mappings & Helpers
export const getBranchDisplayName = (dbBranch) => {
  if (!dbBranch) return '';
  const mapping = {
    'CSE': 'CSE',
    'CSE AI/ML': 'CSM',
    'CSE Data Science': 'CSD',
    'MECH': 'Mech',
    'EEE': 'EEE',
    'ECE': 'ECE'
  };
  return mapping[dbBranch] || dbBranch;
};

export const getPreferredBranchForTrack = (slug) => {
  const mapping = {
    'vlsi-semiconductor-engineer': 'ECE',
    'embedded-system-iot-design-engineer': 'ECE, EEE, CSE',
    'software-engineer-software-developer': 'CSE, CSM, CSD',
    'full-stack-developer': 'CSE, CSM, CSD',
    'ev-power-systems-automation-engineer': 'EEE',
    'design-cae-manufacturing-engineer': 'Mech',
    'data-analyst-data-scientist-ai-ml-engineer': 'CSM, CSD, CSE',
    'cloud-engineer-devops-engineer-cyber-security-engineer': 'CSE, CSM, CSD'
  };
  return mapping[slug] || '';
};

export const isTrackPreferredForBranch = (slug, dbBranch) => {
  const preferredBranchStr = getPreferredBranchForTrack(slug);
  const studentBranchDisplay = getBranchDisplayName(dbBranch);
  
  if (!preferredBranchStr || !studentBranchDisplay) return false;
  
  const preferredBranches = preferredBranchStr.split(',').map(b => b.trim());
  return preferredBranches.includes(studentBranchDisplay);
};