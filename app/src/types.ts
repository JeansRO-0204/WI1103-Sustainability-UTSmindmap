export type NodeType = 'root' | 'module' | 'topic' | 'concept' | 'definition' | 'framework' | 'example' | 'case-study' | 'data' | 'policy' | 'debate'
export type EdgeType = 'related' | 'causes' | 'example-of' | 'contrasts' | 'applies-to' | 'builds-on'

export interface Source { module: string; slides: number[] }
export interface GNode {
  id: string
  label: string
  type: NodeType
  module?: string | null
  parent?: string | null
  summary: string
  details?: string
  keyTerms?: string[]
  examTips?: string
  importance: 1 | 2 | 3
  sources?: Source[]
}
export interface GEdge { source: string; target: string; type: EdgeType; label?: string }
export interface GModule { id: string; week?: number; title: string; file?: string; slideCount?: number; color?: string; summary?: string }
export interface Graph { meta?: { course?: string; generated?: string; sample?: boolean }; modules: GModule[]; nodes: GNode[]; edges: GEdge[] }
export interface Chunk {
  id: string; module: string; slide: number; slideCount: number; title: string; text: string; notes?: string
  hidden?: boolean; image?: string; thumb?: string; nodeIds?: string[]
}
export type LayoutMode = 'radial' | 'lr'
