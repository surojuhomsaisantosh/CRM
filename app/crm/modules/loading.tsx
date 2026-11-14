import { Loader2 } from 'lucide-react'

export default function ModulesLoading() {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-[#e8ecf2] shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[#0f1d33]" />
      </div>
      <p className="text-xs font-semibold text-[#5a6a82]">Loading Module Controls & Access...</p>
    </div>
  )
}
