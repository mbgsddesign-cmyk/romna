export default function HomePage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden pb-24" style={{ background: '#09140f' }}>
      {/* Header */}
      <header className="pt-12 pb-2 px-6 flex flex-col items-start justify-end z-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-0.5">
          ROMNA
          <span className="inline-block w-2 h-2 ml-1 rounded-full mb-1" style={{ backgroundColor: '#f9f506', boxShadow: '0 0 15px rgba(249, 245, 6, 0.15)' }}></span>
        </h1>
        <p className="text-gray-400 text-sm font-light tracking-wide opacity-80 uppercase">AI Decision Center</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 space-y-6 overflow-y-auto no-scrollbar pb-10">
        {/* NOW Card */}
        <div className="group relative w-full rounded-[2.5rem] p-1 transition-transform duration-300 active:scale-[0.99]" style={{ 
          backgroundColor: '#121e18',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5)'
        }}>
          <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none" style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.1), transparent)'
          }}></div>
          
          <div className="relative flex flex-col h-full rounded-[2.2rem] p-6 overflow-hidden" style={{ backgroundColor: '#121e18' }}>
            {/* Decorative glow */}
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(249, 245, 6, 0.05)' }}></div>
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wider animate-pulse" style={{ color: '#f9f506' }}>NOW</span>
                <div className="h-1.5 w-1.5 rounded-full" style={{ 
                  backgroundColor: '#f9f506',
                  boxShadow: '0 0 8px rgba(249, 245, 6, 0.8)' 
                }}></div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 font-medium border rounded-full px-3 py-1" style={{
                borderColor: 'rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }}>
                <span>Focus Mode</span>
              </div>
            </div>

            {/* Task Content */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 rounded-full text-white ring-1" style={{
                  backgroundColor: '#1a2921',
                  ringColor: 'rgba(255, 255, 255, 0.1)'
                }}>
                  <span className="material-symbols-outlined material-symbols-outlined-fill">notifications_active</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold leading-tight text-white mb-2">Review Q3 projections</h2>
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-black" style={{
                      backgroundColor: 'rgba(249, 245, 6, 0.9)'
                    }}>
                      <span className="material-symbols-outlined text-[16px] font-bold">flag</span>
                      <span className="text-[10px] font-bold uppercase">High Priority</span>
                    </div>
                    <div className="inline-flex items-center gap-1 border px-3 py-1 rounded-full text-gray-300" style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }}>
                      <span className="text-[10px] font-medium uppercase tracking-wide">Work</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-1 pl-14">
                <span className="material-symbols-outlined text-gray-500 text-[18px]">psychology</span>
                <p className="text-sm text-gray-400 font-light">Best time for analytical tasks.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-4">
              <button className="relative w-full h-14 rounded-full flex items-center justify-center text-black font-bold text-lg tracking-wide overflow-hidden group/btn" style={{
                backgroundColor: '#f9f506',
                boxShadow: '0 0 20px rgba(249, 245, 6, 0.25)',
                animation: 'pulse-ring 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}>
                <div className="absolute inset-0 scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-500 origin-left" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.3)'
                }}></div>
                <span className="relative z-10 flex items-center gap-2">
                  <span className="material-symbols-outlined">play_arrow</span>
                  Execute
                </span>
              </button>
              
              <div className="flex justify-center gap-8 opacity-80">
                <button className="text-xs font-medium text-gray-400 hover:text-[#f9f506] transition-colors flex items-center gap-1.5 py-2 px-4 rounded-full hover:bg-white/5">
                  <span className="material-symbols-outlined text-[16px]">snooze</span>
                  Snooze
                </button>
                <button className="text-xs font-medium text-gray-400 hover:text-[#f9f506] transition-colors flex items-center gap-1.5 py-2 px-4 rounded-full hover:bg-white/5">
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  Adjust
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="flex flex-col gap-6 pt-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 group cursor-pointer">
              <h2 className="text-xl font-bold text-white tracking-tight">October <span className="text-gray-500 font-normal">2023</span></h2>
              <span className="material-symbols-outlined text-gray-500 group-hover:text-[#f9f506] transition-colors text-sm">expand_more</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white border active:scale-95 transition-all" style={{
                backgroundColor: '#1a2921',
                borderColor: 'rgba(255, 255, 255, 0.05)'
              }}>
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white border active:scale-95 transition-all" style={{
                backgroundColor: '#1a2921',
                borderColor: 'rgba(255, 255, 255, 0.05)'
              }}>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
              <button className="ml-2 w-9 h-9 rounded-full flex items-center justify-center text-black font-bold active:scale-95 transition-all hover:bg-white" style={{
                backgroundColor: '#f9f506',
                boxShadow: '0 0 15px rgba(249, 245, 6, 0.15)'
              }}>
                <span className="material-symbols-outlined text-lg font-bold">add</span>
              </button>
            </div>
          </div>

          {/* Calendar Strip */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x px-1">
            {/* Active Day */}
            <div className="snap-start flex flex-col items-center justify-center gap-1 min-w-[3.8rem] h-[5.5rem] rounded-[1.8rem] transform transition-transform hover:scale-105 cursor-pointer" style={{
              background: 'linear-gradient(to bottom right, #f9f506, #e6d800)',
              boxShadow: '0 0 15px rgba(249, 245, 6, 0.15)'
            }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>Mon</span>
              <span className="text-2xl font-bold text-black leading-none">16</span>
              <div className="w-1.5 h-1.5 rounded-full bg-black mt-1"></div>
            </div>

            {/* Inactive Days */}
            {[
              { day: 'Tue', date: '17', active: true },
              { day: 'Wed', date: '18', active: false },
              { day: 'Thu', date: '19', active: false },
              { day: 'Fri', date: '20', active: false },
            ].map((item, idx) => (
              <div key={idx} className="snap-start flex flex-col items-center justify-center gap-1 min-w-[3.8rem] h-[5.5rem] border rounded-[1.8rem] text-gray-400 hover:bg-[#23362b] hover:border-white/10 transition-all cursor-pointer group" style={{
                backgroundColor: item.active ? '#1a2921' : '#121e18',
                borderColor: 'rgba(255, 255, 255, 0.05)'
              }}>
                <span className={`text-xs font-medium group-hover:text-gray-300 uppercase tracking-wide ${item.active ? 'text-gray-400' : 'text-gray-500'}`}>{item.day}</span>
                <span className={`text-2xl font-bold leading-none ${item.active ? 'text-white' : 'text-gray-300'}`}>{item.date}</span>
                <div className={`w-1.5 h-1.5 rounded-full mt-1 ${item.active ? 'bg-white/20 group-hover:bg-[#f9f506]/50' : 'bg-transparent'}`}></div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative min-h-[400px] timeline-line">
            {/* NOW Line */}
            <div className="absolute top-[180px] left-[27px] right-0 h-[1px] z-20 flex items-center" style={{
              background: 'linear-gradient(to right, #f9f506, rgba(249, 245, 6, 0.5), transparent)'
            }}>
              <div className="absolute -left-[4px] w-2.5 h-2.5 rounded-full" style={{
                backgroundColor: '#f9f506',
                boxShadow: '0 0 10px rgba(249, 245, 6, 0.5), 0 0 20px rgba(249, 245, 6, 0.3)'
              }}></div>
              <div className="ml-4 px-2 py-0.5 rounded text-[10px] font-bold" style={{
                backgroundColor: 'rgba(249, 245, 6, 0.2)',
                color: '#f9f506'
              }}>14:24 NOW</div>
            </div>

            <div className="space-y-6 pb-20">
              {/* Completed Tasks */}
              {[
                { time: '09:00', title: 'Morning Standup', color: 'rgba(59, 130, 246, 0.8)', completed: true, label: 'Completed' },
                { time: '10:30', title: 'Client Call: TechCorp', color: 'rgba(168, 85, 247, 0.8)', completed: true, tags: [{ text: 'Sales', color: 'gray' }, { text: '45m', plain: true }] },
              ].map((task, idx) => (
                <div key={idx} className="relative flex gap-4 group">
                  <div className="w-14 text-right text-xs text-gray-500 font-medium pt-3 opacity-60">{task.time}</div>
                  <div className="flex-1 border rounded-2xl p-4 relative overflow-hidden active:scale-[0.98] transition-transform" style={{
                    backgroundColor: '#121e18',
                    borderColor: 'rgba(255, 255, 255, 0.05)'
                  }}>
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: task.color }}></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-gray-300 font-medium text-sm opacity-60" style={{
                          textDecoration: 'line-through',
                          textDecorationColor: '#6b7280',
                          textDecorationThickness: '1px'
                        }}>{task.title}</h4>
                        {task.label && <p className="text-xs text-gray-600 mt-1">{task.label}</p>}
                        {task.tags && (
                          <div className="flex items-center gap-2 mt-2 opacity-50">
                            {task.tags.map((tag, i) => (
                              tag.plain ? (
                                <span key={i} className="text-xs text-gray-500">{tag.text}</span>
                              ) : (
                                <span key={i} className="text-[10px] text-gray-400 border border-gray-700 px-1.5 py-0.5 rounded">{tag.text}</span>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                      {task.completed && (
                        <span className="material-symbols-outlined text-sm" style={{ color: '#10b981' }}>check_circle</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Active Task */}
              <div className="relative flex gap-4 group">
                <div className="w-14 text-right text-xs font-bold pt-3" style={{
                  color: '#f9f506',
                  filter: 'drop-shadow(0 0 5px rgba(249, 245, 6, 0.5))'
                }}>14:00</div>
                <div className="flex-1 border rounded-2xl p-4 relative overflow-hidden active:scale-[0.98] transition-transform" style={{
                  background: 'linear-gradient(to right, #1a2921, #121e18)',
                  borderColor: 'rgba(249, 245, 6, 0.3)',
                  boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5)'
                }}>
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{
                    backgroundColor: '#f9f506',
                    boxShadow: '0 0 10px rgba(249, 245, 6, 0.5), 0 0 20px rgba(249, 245, 6, 0.3)'
                  }}></div>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-white font-bold text-base">Review Q3 Projections</h4>
                    <span className="material-symbols-outlined text-sm animate-pulse" style={{ color: '#f9f506' }}>timelapse</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Preparation for board meeting.</p>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <img alt="User" className="w-6 h-6 rounded-full border" style={{ borderColor: '#1a2921' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkV1I7jl3o-D5lQky9QTBvoHOGV7wM8qb4BdA4XSPFp0DCr3DSocMdKwQm0QZDkCmO1U6YeiJfyEdpYRQjmVUaWUugrrf7PEGIFvZFI-8F909gXrylrrp9UMqA-SQNFTPXXrZi9kx6qRserw-4w_UKH7fy9TFKpxXfi4Ir3682IVrGiMFPJ-TORjY2ubkQRngJ1RDDTWmgq5mHSYaW84ZwBSInyIftJ2T-8cTGuNc_NIXEGyx-o6JpQpdgTUegkj2U4-sDCYm-Se8" />
                      <img alt="User" className="w-6 h-6 rounded-full border" style={{ borderColor: '#1a2921' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsQ6inBKjeazw-AF4tzaiC7L-h375AGQxFSEq91Y0zquKva5hyMTBfiCkA4ni9bgHrNhUF4xs4UFY92ETMjD_gy4NOfIXJTx1tRivk2rvfsgXD3YFfpIFTUW4cSMZn01cI4Gi1TintyThXN-sMW_fTrr8vRIo8-YnukoMohmQH5oYeNczvYE8ozurvk_274cM4obR7bldANMS5XY1ZBP38cFfzQaBwlWn_-8sM0UDBolYstMvSKivN1TvWVgHzVdKUGdyFg4gfvn0" />
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded" style={{
                      color: '#f9f506',
                      backgroundColor: 'rgba(249, 245, 6, 0.1)'
                    }}>Work</span>
                  </div>
                </div>
              </div>

              {/* Upcoming Task */}
              <div className="relative flex gap-4 group">
                <div className="w-14 text-right text-xs text-gray-400 font-medium pt-3">16:30</div>
                <div className="flex-1 border rounded-2xl p-4 relative overflow-hidden active:scale-[0.98] transition-transform hover:bg-[#1a2921]/50" style={{
                  backgroundColor: '#121e18',
                  borderColor: 'rgba(255, 255, 255, 0.05)'
                }}>
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: 'rgba(251, 146, 60, 0.8)' }}></div>
                  <h4 className="text-white font-medium text-sm">Pick up laundry</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Personal • 15m</span>
                  </div>
                </div>
              </div>

              {/* Insight Card */}
              <div className="relative flex gap-4 mt-6">
                <div className="w-14 flex justify-end pt-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                    backgroundColor: 'rgba(249, 245, 6, 0.1)',
                    color: '#f9f506'
                  }}>
                    <span className="material-symbols-outlined text-sm">auto_graph</span>
                  </div>
                </div>
                <div className="flex-1 border rounded-2xl p-4 flex items-center justify-between" style={{
                  backgroundColor: 'rgba(26, 40, 33, 0.4)',
                  borderColor: 'rgba(255, 255, 255, 0.05)'
                }}>
                  <div>
                    <p className="text-sm font-bold text-white">Productivity Insight</p>
                    <p className="text-xs text-gray-400 mt-0.5">You usually complete 'Work' tasks 15% faster in the afternoon.</p>
                  </div>
                  <button className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-white" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  }}>
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
              </div>

              {/* Add Task */}
              <div className="relative flex gap-4 group opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="w-14 text-right text-xs text-gray-500 font-medium pt-2">18:00</div>
                <div className="flex-1 h-12 border border-dashed rounded-2xl flex items-center px-4 hover:border-[#f9f506]/50 hover:bg-[#f9f506]/5" style={{
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}>
                  <span className="text-xs text-gray-500 italic">+ Add task</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-24"></div>
      </main>

      {/* Floating AI Button */}
      <button className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full border flex items-center justify-center group active:scale-90 transition-all duration-300" style={{
        backgroundColor: '#1a2921',
        borderColor: 'rgba(249, 245, 6, 0.2)',
        boxShadow: '0 0 15px rgba(249, 245, 6, 0.15)',
        color: '#f9f506'
      }}>
        <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: 'rgba(249, 245, 6, 0.05)' }}></span>
        <span className="material-symbols-outlined animate-rotate-slow group-hover:text-white transition-colors">smart_toy</span>
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50">
        <div className="absolute bottom-0 w-full h-32 pointer-events-none" style={{
          background: 'linear-gradient(to top, #09140f, rgba(9, 20, 15, 0.95), transparent)'
        }}></div>
        <div className="relative border-t pb-8 pt-2 px-6" style={{
          backgroundColor: 'rgba(9, 20, 15, 0.8)',
          backdropFilter: 'blur(24px)',
          borderColor: 'rgba(255, 255, 255, 0.05)'
        }}>
          <div className="flex items-end justify-between">
            <div className="flex flex-col items-center gap-1 w-12 cursor-pointer group">
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ color: '#f9f506' }}>home_app_logo</span>
              <div className="w-1 h-1 rounded-full" style={{
                backgroundColor: '#f9f506',
                boxShadow: '0 0 5px #f9f506'
              }}></div>
            </div>
            <div className="flex flex-col items-center gap-1 w-12 cursor-pointer group opacity-50 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">search</span>
              <div className="w-1 h-1 rounded-full bg-transparent"></div>
            </div>
            <div className="relative -top-5 cursor-pointer group">
              <div className="absolute inset-0 rounded-full blur-xl" style={{ backgroundColor: 'rgba(249, 245, 6, 0.2)' }}></div>
              <div className="relative w-16 h-16 rounded-full border flex items-center justify-center shadow-lg transition-transform duration-200 group-active:scale-95" style={{
                background: 'linear-gradient(to bottom right, #1a2921, black)',
                borderColor: 'rgba(249, 245, 6, 0.3)'
              }}>
                <span className="material-symbols-outlined text-3xl group-hover:animate-pulse" style={{ color: '#f9f506' }}>mic</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 w-12 cursor-pointer group opacity-50 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">calendar_month</span>
              <div className="w-1 h-1 rounded-full bg-transparent"></div>
            </div>
            <div className="flex flex-col items-center gap-1 w-12 cursor-pointer group opacity-50 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">settings</span>
              <div className="w-1 h-1 rounded-full bg-transparent"></div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
