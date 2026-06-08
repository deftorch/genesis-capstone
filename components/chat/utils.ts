import {
  PieChart,
  Network,
  BarChart3,
  Clock,
  GitFork,
  Shapes,
  Play,
  Code,
  Film,
  Image as ImageIcon,
  Layout,
} from 'lucide-react';
import { RendererType } from '@/types';

export const getRelativeTimeString = (dateInput: Date | string) => {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getCategoryInfo = (renderer: RendererType, code: string = '', title: string = '') => {
  const t = title.toLowerCase();
  const c = code.toLowerCase();
  const r = renderer || 'p5';

  if (r === 'd3') {
    if (t.includes('pie') || c.includes('d3.arc') || c.includes('pie')) {
      return {
        name: 'Pie Chart',
        icon: PieChart,
        colorClass: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
      };
    }
    if (t.includes('network') || t.includes('graph') || c.includes('forcesimulation') || c.includes('link')) {
      return {
        name: 'Network',
        icon: Network,
        colorClass: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
      };
    }
    return {
      name: 'Bar Chart',
      icon: BarChart3,
      colorClass: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    };
  }

  if (r === 'mermaid') {
    if (t.includes('sequence') || c.includes('sequencediagram')) {
      return {
        name: 'Sequence',
        icon: Clock,
        colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
      };
    }
    return {
      name: 'Flowchart',
      icon: Network,
      colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    };
  }

  if (r === 'svg') {
    if (t.includes('diagram') || t.includes('flow') || t.includes('chart')) {
      return {
        name: 'Diagram',
        icon: GitFork,
        colorClass: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
      };
    }
    return {
      name: 'Logo',
      icon: Shapes,
      colorClass: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
    };
  }

  if (t.includes('game') || t.includes('play') || t.includes('interactive') || c.includes('keypressed') || c.includes('mouseclicked') || c.includes('game')) {
    return {
      name: 'Game',
      icon: Play,
      colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    };
  }
  if (t.includes('pattern') || t.includes('wave') || t.includes('grid') || t.includes('gradient') || c.includes('sin(') || c.includes('cos(')) {
    return {
      name: 'Pattern',
      icon: Code,
      colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    };
  }
  if (t.includes('animation') || t.includes('bouncing') || t.includes('particle') || c.includes('framecount') || c.includes('framerate')) {
    return {
      name: 'Animation',
      icon: Film,
      colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    };
  }
  if (t.includes('art') || t.includes('fractal') || t.includes('generative') || c.includes('random') || c.includes('noise')) {
    return {
      name: 'Art',
      icon: ImageIcon,
      colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    };
  }

  return {
    name: 'Canvas',
    icon: Layout,
    colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  };
};
