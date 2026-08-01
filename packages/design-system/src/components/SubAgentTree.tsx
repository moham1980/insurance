'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { ChevronDown, ChevronLeft, Users, Briefcase } from 'lucide-react';

export interface SubAgentNode {
  partyId: string;
  name: string;
  role: 'agent' | 'sub_agent' | 'broker';
  commissionSplit?: number;
  children?: SubAgentNode[];
  activePolicyCount?: number;
  ytdPremium?: number;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface SubAgentTreeProps {
  nodes: SubAgentNode[];
  onSelect?: (node: SubAgentNode) => void;
  className?: string;
}

function TreeNode({
  node,
  depth = 0,
  onSelect,
}: {
  node: SubAgentNode;
  depth?: number;
  onSelect?: (node: SubAgentNode) => void;
}) {
  const [expanded, setExpanded] = React.useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;

  const statusColor = {
    active: 'bg-success',
    inactive: 'bg-text-muted',
    suspended: 'bg-danger',
  }[node.status || 'active'];

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-md py-2 pr-2 hover:bg-bg-subtle',
          depth > 0 && 'mr-6 border-r border-border-default pr-4'
        )}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect?.(node);
        }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-text-muted hover:text-text-primary"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}

        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-bg-subtle text-text-secondary')}>
          {node.role === 'broker' ? <Briefcase className="h-4 w-4" /> : <Users className="h-4 w-4" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{node.name}</span>
            <span className={cn('h-2 w-2 rounded-full', statusColor)} />
          </div>
          <div className="flex gap-3 text-caption text-text-muted">
            <span>{node.role === 'broker' ? 'کارگزار' : node.role === 'agent' ? 'نماینده' : 'زیرنماینده'}</span>
            {node.commissionSplit != null && <span>{node.commissionSplit}% سهم</span>}
            {node.activePolicyCount != null && <span>{node.activePolicyCount} بیمه‌نامه</span>}
            {node.ytdPremium != null && (
              <span>{new Intl.NumberFormat('fa-IR').format(node.ytdPremium)} حق‌بیمه YTD</span>
            )}
          </div>
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="mt-1">
          {node.children!.map((child) => (
            <TreeNode key={child.partyId} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SubAgentTree({ nodes, onSelect, className }: SubAgentTreeProps) {
  return (
    <div className={cn('rounded-xl border border-border-default bg-bg-base p-4', className)}>
      {nodes.map((node) => (
        <TreeNode key={node.partyId} node={node} onSelect={onSelect} />
      ))}
    </div>
  );
}
