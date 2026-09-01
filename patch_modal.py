import re

with open('src/components/BookingConfirmationModal.tsx', 'r') as f:
    content = f.read()

# Change the main outer container to not have overflow-y-auto on itself
content = content.replace(
    '''<div className="bg-orange-950 text-neutral-100 border-2 border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl shadow-orange-900/20 relative">''',
    '''<div className="bg-orange-950 text-neutral-100 border-2 border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-orange-900/20 relative overflow-hidden">'''
)

# Keep the close button where it is, but it will now be relative to the overflow-hidden parent.
# Add a wrapper for the scrolling content immediately after the close button
content = content.replace(
    '''        </button>

        {/* Voucher Header */}
        <div className="text-center space-y-3 pb-6 border-b border-white/10">''',
    '''        </button>

        <div className="overflow-y-auto p-6 sm:p-8 custom-scrollbar w-full flex-1">
        {/* Voucher Header */}
        <div className="text-center space-y-3 pb-6 border-b border-white/10">'''
)

# And close the new wrapper right before the end of the main div
content = content.replace(
    '''              <span>{language === 'es' ? 'Añadir a Google Tasks' : 'Add to Google Tasks'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};''',
    '''              <span>{language === 'es' ? 'Añadir a Google Tasks' : 'Add to Google Tasks'}</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};'''
)

# Make sure the close button has a z-index and adjust its positioning slightly so it sits neatly in the corner 
# above the padding of the scrolling content.
content = content.replace(
    '''className="absolute top-6 right-6 w-10 h-10 bg-orange-900 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center transition-colors"''',
    '''className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 w-10 h-10 bg-orange-950 border border-white/10 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center transition-colors shadow-lg"'''
)

with open('src/components/BookingConfirmationModal.tsx', 'w') as f:
    f.write(content)
