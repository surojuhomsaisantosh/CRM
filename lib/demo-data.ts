/**
 * High-performance in-memory mock repository for local / demo mode.
 * Guarantees 0ms latency when live Supabase credentials are not connected yet.
 */

export interface DemoLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  project: string;
  property_interest: string;
  budget: string;
  location: string;
  message?: string;
  created_at: string;
  assigned_to?: string;
}

export const INITIAL_DEMO_LEADS: DemoLead[] = [
  {
    id: 'lead-001',
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@gmail.com',
    phone: '+919876543210',
    status: 'new',
    source: 'website',
    project: 'Skyline Heights',
    property_interest: '3 BHK Luxury Apartment',
    budget: '₹1.5 Cr - ₹2 Cr',
    location: 'Bangalore, Indiranagar',
    message: 'Interested in ready-to-move east facing 3BHK on higher floor.',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    assigned_to: 'admin@crm.internal',
  },
  {
    id: 'lead-002',
    name: 'Priya Patel',
    email: 'priya.patel@outlook.com',
    phone: '+919812345678',
    status: 'contacted',
    source: 'meta',
    project: 'Emerald Valley Villas',
    property_interest: '4 BHK Duplex Villa',
    budget: '₹2.8 Cr - ₹3.5 Cr',
    location: 'Hyderabad, Gachibowli',
    message: 'Looking for gated community villa with private garden.',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    assigned_to: 'admin@crm.internal',
  },
  {
    id: 'lead-003',
    name: 'Amit Verma',
    email: 'amit.verma@techcorp.in',
    phone: '+919898765432',
    status: 'qualified',
    source: 'google',
    project: 'Skyline Heights',
    property_interest: '2 BHK Premium',
    budget: '₹95 Lakhs - ₹1.2 Cr',
    location: 'Bangalore, Whitefield',
    message: 'Pre-approved loan ready, looking for early possession.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    assigned_to: 'admin@crm.internal',
  },
  {
    id: 'lead-004',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@gmail.com',
    phone: '+919701234567',
    status: 'site_visit',
    source: 'referral',
    project: 'Royal Palms Resort & Residences',
    property_interest: 'Luxury Penthouse',
    budget: '₹4 Cr+',
    location: 'Hyderabad, Jubilee Hills',
    message: 'Site visit scheduled for upcoming Saturday morning.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    assigned_to: 'admin@crm.internal',
  },
  {
    id: 'lead-005',
    name: 'Vikram Malhotra',
    email: 'v.malhotra@enterprise.com',
    phone: '+919988776655',
    status: 'negotiation',
    source: 'walk_in',
    project: 'Grand Central Towers',
    property_interest: 'Grade-A Commercial Space',
    budget: '₹5 Cr - ₹7 Cr',
    location: 'Mumbai, BKC',
    message: 'Commercial space required for 40-member IT consultancy.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    assigned_to: 'admin@crm.internal',
  },
  {
    id: 'lead-006',
    name: 'Kavita Sundaram',
    email: 'kavita.s@fintech.co',
    phone: '+919845112233',
    status: 'won',
    source: 'meta',
    project: 'Emerald Valley Villas',
    property_interest: '3 BHK Villa',
    budget: '₹2.2 Cr',
    location: 'Hyderabad, Tellapur',
    message: 'Booking advance received, agreement signing in progress.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    assigned_to: 'admin@crm.internal',
  },
];

export const INITIAL_DEMO_STATUSES = [
  { id: 'st-1', name: 'New', color: '#3b82f6', is_default: true, sort_order: 1 },
  { id: 'st-2', name: 'Contacted', color: '#f59e0b', is_default: false, sort_order: 2 },
  { id: 'st-3', name: 'Qualified', color: '#10b981', is_default: false, sort_order: 3 },
  { id: 'st-4', name: 'Site Visit', color: '#8b5cf6', is_default: false, sort_order: 4 },
  { id: 'st-5', name: 'Negotiation', color: '#f97316', is_default: false, sort_order: 5 },
  { id: 'st-6', name: 'Won', color: '#059669', is_default: false, sort_order: 6 },
  { id: 'st-7', name: 'Lost', color: '#ef4444', is_default: false, sort_order: 7 },
];

export const INITIAL_DEMO_PROJECTS = [
  {
    id: 'proj-1',
    name: 'Skyline Heights',
    category_name: 'Luxury Residential',
    location: 'Indiranagar, Bangalore',
    description: 'Ultra-luxury high-rise residences with panoramic city views and 40+ clubhouse amenities.',
    google_maps_url: 'https://maps.google.com',
    approval_certificate_label: 'RERA & BBMP Approved',
  },
  {
    id: 'proj-2',
    name: 'Emerald Valley Villas',
    category_name: 'Gated Villa Community',
    location: 'Gachibowli Financial District, Hyderabad',
    description: 'Serene lakeside 4 & 5 BHK villas designed with biophilic architecture and smart home automation.',
    google_maps_url: 'https://maps.google.com',
    approval_certificate_label: 'HMDA & RERA Approved',
  },
  {
    id: 'proj-3',
    name: 'Grand Central Towers',
    category_name: 'Commercial Tech Park',
    location: 'Bandra Kurla Complex (BKC), Mumbai',
    description: 'Grade-A LEED Platinum certified sustainable corporate office suites.',
    google_maps_url: 'https://maps.google.com',
    approval_certificate_label: 'MCGM & RERA Approved',
  },
];
