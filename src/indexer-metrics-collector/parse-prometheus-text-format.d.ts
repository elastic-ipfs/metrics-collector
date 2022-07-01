declare module "parse-prometheus-text-format" {
    type GaugeDescriptor = {
        type: 'GAUGE'
        name: string
        help: string
        metrics: Array<{
            value: number
            labels?: Record<string,string>
        }>
    }
    type HistogramDescriptor = {
        type: 'HISTOGRAM'
        name: string
        help: string
        metrics: Array<{
            buckets: Record<string,string>
            count: string
            sum: string
            labels?: Record<string,string>
        }>
    }
    type SummaryDescriptor = {
        type: 'SUMMARY'
        name: string
        help: string
        metrics: Array<{
            quantiles?: Record<string,string>
            count: string
            sum: string
            labels?: Record<string,string>
        }>
    }
    type UntypedDescriptor = {
        type: 'UNTYPED'
        name: string
        help: string
        metrics: Array<{
            value: string
            labels?: Record<string,string>
        }>
    }
    type CounterDescriptor = {
        type: 'COUNTER'
        name: string
        help: string
        metrics: Array<{
            value: string
            labels?: Record<string,string>
        }>
    }
    type MetricsDescriptor = GaugeDescriptor | HistogramDescriptor | SummaryDescriptor | UntypedDescriptor | CounterDescriptor
    export default function parse(metricsString: string): MetricsDescriptor[]
}
