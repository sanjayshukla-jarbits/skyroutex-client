'use client'

import { useState } from 'react'
import { BookOpen, Search, ChevronRight, Play, FileText, Video, HelpCircle, Download, ExternalLink } from 'lucide-react'

export default function Guide() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('getting-started')

  const categories = [
    { id: 'getting-started', name: 'Getting Started', icon: Play, count: 8 },
    { id: 'missions', name: 'Mission Management', icon: FileText, count: 12 },
    { id: 'routes', name: 'Route Planning', icon: ChevronRight, count: 6 },
    { id: 'vehicles', name: 'Vehicle Operations', icon: Play, count: 10 },
    { id: 'safety', name: 'Safety Protocols', icon: HelpCircle, count: 15 },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: HelpCircle, count: 9 }
  ]

  const guides = {
    'getting-started': [
      { title: 'Welcome to Jarbits Platform', description: 'Learn the basics of the platform', type: 'article', duration: '5 min read' },
      { title: 'Platform Overview Video', description: 'Visual tour of all features', type: 'video', duration: '10 min' },
      { title: 'Creating Your First Mission', description: 'Step-by-step mission creation guide', type: 'article', duration: '8 min read' },
      { title: 'Understanding the Dashboard', description: 'Navigate the main interface', type: 'article', duration: '6 min read' },
      { title: 'User Roles and Permissions', description: 'Learn about access levels', type: 'article', duration: '7 min read' },
      { title: 'Quick Start Checklist', description: 'Essential steps for new users', type: 'pdf', duration: 'Download' },
    ],
    'missions': [
      { title: 'Mission Planning Best Practices', description: 'Optimize your mission planning', type: 'article', duration: '12 min read' },
      { title: 'Mission Status and Monitoring', description: 'Track mission progress', type: 'video', duration: '8 min' },
      { title: 'Emergency Mission Protocols', description: 'Handle urgent situations', type: 'article', duration: '10 min read' },
      { title: 'Mission Templates', description: 'Use pre-configured mission types', type: 'article', duration: '5 min read' },
    ],
    'routes': [
      { title: 'Route Planning Fundamentals', description: 'Create efficient flight paths', type: 'video', duration: '15 min' },
      { title: 'Waypoint Management', description: 'Add and manage waypoints', type: 'article', duration: '7 min read' },
      { title: 'No-Fly Zone Compliance', description: 'Respect restricted areas', type: 'article', duration: '9 min read' },
    ],
    'vehicles': [
      { title: 'UAV Pre-Flight Checklist', description: 'Ensure vehicle readiness', type: 'pdf', duration: 'Download' },
      { title: 'Battery Management', description: 'Optimize battery performance', type: 'article', duration: '6 min read' },
      { title: 'Vehicle Maintenance Schedule', description: 'Regular upkeep guidelines', type: 'article', duration: '8 min read' },
    ],
    'safety': [
      { title: 'Safety Protocol Overview', description: 'Essential safety guidelines', type: 'video', duration: '20 min' },
      { title: 'Emergency Landing Procedures', description: 'Handle emergency situations', type: 'article', duration: '10 min read' },
      { title: 'Weather Assessment Guide', description: 'Evaluate flight conditions', type: 'article', duration: '7 min read' },
    ],
    'troubleshooting': [
      { title: 'Common Issues and Solutions', description: 'Fix frequent problems', type: 'article', duration: '15 min read' },
      { title: 'Connection Problems', description: 'Resolve connectivity issues', type: 'article', duration: '5 min read' },
      { title: 'Performance Optimization', description: 'Improve system performance', type: 'article', duration: '8 min read' },
    ]
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={16} className="text-red-400" />
      case 'pdf': return <Download size={16} className="text-green-400" />
      default: return <FileText size={16} className="text-blue-400" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-red-500 bg-opacity-20'
      case 'pdf': return 'bg-green-500 bg-opacity-20'
      default: return 'bg-blue-500 bg-opacity-20'
    }
  }

  return (
    <div className="flex-1 bg-slate-900 min-h-screen p-8">
      {/* Header */}
      <div className="bg-blue-600 rounded-xl p-6 mb-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Help & Guide</h1>
            <p className="text-blue-100">Learn how to use the Jarbits SkyrouteX Platform</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors">
              <ExternalLink size={20} />
              <span>Documentation</span>
            </button>
            <button className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg">
              <HelpCircle size={20} />
              <span>Contact Support</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search guides, tutorials, and documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-blue-400 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="col-span-1 space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-xl">
            <h3 className="text-white font-semibold mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon size={18} />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded">{category.count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-xl">
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <div className="space-y-3">
              <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm">
                <ExternalLink size={14} />
                <span>API Documentation</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm">
                <ExternalLink size={14} />
                <span>Video Tutorials</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm">
                <ExternalLink size={14} />
                <span>Community Forum</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm">
                <ExternalLink size={14} />
                <span>Release Notes</span>
              </a>
            </div>
          </div>

          {/* Support Contact */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 shadow-xl">
            <h3 className="text-white font-semibold mb-2">Need Help?</h3>
            <p className="text-blue-100 text-sm mb-4">Our support team is here for you</p>
            <button className="w-full px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-sm">
              Contact Support
            </button>
          </div>
        </div>

        {/* Guides Content */}
        <div className="col-span-3">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {categories.find(c => c.id === selectedCategory)?.name}
              </h2>
              <span className="text-slate-400 text-sm">
                {guides[selectedCategory as keyof typeof guides]?.length} guides
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {guides[selectedCategory as keyof typeof guides]?.map((guide, index) => (
                <div
                  key={index}
                  className="bg-slate-700 rounded-lg p-4 hover:bg-slate-650 transition-colors cursor-pointer border border-slate-600 hover:border-blue-500 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${getTypeColor(guide.type)} p-2 rounded-lg`}>
                      {getTypeIcon(guide.type)}
                    </div>
                    <span className="text-xs text-slate-400">{guide.duration}</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">{guide.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${
                      guide.type === 'video' ? 'bg-red-500 bg-opacity-20 text-red-400' :
                      guide.type === 'pdf' ? 'bg-green-500 bg-opacity-20 text-green-400' :
                      'bg-blue-500 bg-opacity-20 text-blue-400'
                    }`}>
                      {guide.type.toUpperCase()}
                    </span>
                    <ChevronRight size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl mt-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <HelpCircle size={28} className="text-blue-400" />
              <span>Frequently Asked Questions</span>
            </h2>
            <div className="space-y-4">
              {[
                { q: 'How do I create my first mission?', a: 'Navigate to the Missions page and click on "Plan Mission" to get started.' },
                { q: 'What should I do if a mission fails?', a: 'Check the mission logs, verify vehicle status, and review the failure report.' },
                { q: 'How can I add new waypoints to an existing route?', a: 'Open the Route Planning page, select your mission, and use the "Add Stop" button.' },
                { q: 'What are the system requirements?', a: 'Modern web browser (Chrome, Firefox, Safari), stable internet connection, and proper user permissions.' }
              ].map((faq, index) => (
                <div key={index} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-blue-400 font-bold text-sm">Q</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-2">{faq.q}</h4>
                      <p className="text-slate-400 text-sm">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}