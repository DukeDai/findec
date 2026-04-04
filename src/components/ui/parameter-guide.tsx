"use client"

interface ParameterGuideProps {
  paramName: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  description: string
  typicalValues?: number[]
}

export function ParameterGuide({
  paramName, value, min, max, step = 1, onChange, description, typicalValues
}: ParameterGuideProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{paramName}</label>
        <span className="text-sm text-muted-foreground">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground">{description}</p>
      {typicalValues && (
        <div className="flex gap-1">
          {typicalValues.map((v) => (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={`text-xs px-2 py-1 rounded ${
                v === value ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
