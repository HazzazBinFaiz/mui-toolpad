import * as React from 'react';
import clsx from 'clsx';
import { styled, SvgIcon } from '@mui/material';
import { NodeRendererProps, Tree as ArboristTree } from 'react-arborist';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

function getType(value: unknown) {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'string' && /^(#|rgb|rgba|hsl|hsla)/.test(value)) {
    return 'color';
  }

  return typeof value;
}

type PropValueType = ReturnType<typeof getType>;

function getLabel(value: unknown, type: PropValueType, open: boolean): string {
  switch (type) {
    case 'array': {
      const length: number = (value as unknown[]).length;
      if (open) {
        return `Array (${length} ${length === 1 ? 'item' : 'items'})`;
      }
      return length > 0 ? '[…]' : '[]';
    }
    case 'null':
      return 'null';
    case 'undefined':
      return 'undefined';
    case 'function':
      return `f ${(value as Function).name}()`;
    case 'object': {
      const keyCount = Object.keys(value as object).length;
      if (open) {
        return `Object (${keyCount} ${keyCount === 1 ? 'key' : 'keys'})`;
      }
      return keyCount > 0 ? '{…}' : '{}';
    }
    case 'string':
      return `"${value}"`;
    case 'symbol':
      return `Symbol(${String(value)})`;
    case 'bigint':
    case 'boolean':
    case 'number':
    default:
      return String(value);
  }
}

function getTokenType(type: string): string {
  switch (type) {
    case 'color':
      return 'string';
    case 'object':
    case 'array':
      return 'comment';
    default:
      return type;
  }
}

export interface ObjectTreePropertyNode {
  id: string;
  label?: string;
  value: unknown;
  type: PropValueType;
  children?: ObjectTreePropertyNode[];
}

function createPropertiesData(data: object, id: string): ObjectTreePropertyNode[] {
  const result: ObjectTreePropertyNode[] = [];
  for (const [label, value] of Object.entries(data)) {
    const itemId = `${id}.${label}`;
    const type = getType(value);
    result.push({
      id: itemId,
      label,
      value,
      type,
      children:
        value && typeof value === 'object' ? createPropertiesData(value, itemId) : undefined,
    });
  }
  return result;
}

export interface CreateObjectTreeDataParams {
  label?: string;
  id?: string;
}

export function createObjectTreeData(
  data: unknown,
  { id = '$ROOT', label }: CreateObjectTreeDataParams,
): ObjectTreePropertyNode[] {
  const children = data && typeof data === 'object' ? createPropertiesData(data, id) : [];
  return [
    {
      label,
      id,
      type: getType(data),
      value: data,
      children: children.length > 0 ? children : undefined,
    },
  ];
}

const classes = {
  node: 'Toolpad__ObjectExplorerNode',
  token: 'Toolpad__ObjectExplorerToken',
};

export const Tree = styled(ArboristTree<ObjectTreePropertyNode>)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? '#d4d4d4' : '#000000',
  background: theme.palette.mode === 'dark' ? '#0c2945' : '#ffffff',
  fontSize: 12,
  fontFamily:
    '"SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace;',

  [`.${classes.node}`]: {
    whiteSpace: 'noWrap',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },

  [`& .${classes.token}.string`]: {
    color: theme.palette.mode === 'dark' ? '#ce9178' : '#a31515',
  },
  [`& .${classes.token}.boolean`]: {
    color: theme.palette.mode === 'dark' ? '#569cd6' : '#0000ff',
  },
  [`& .${classes.token}.number`]: {
    color: theme.palette.mode === 'dark' ? '#b5cea8' : '#098658',
  },
  [`& .${classes.token}.comment`]: {
    color: theme.palette.mode === 'dark' ? '#608b4e' : '#008000',
  },
  [`& .${classes.token}.null`]: {
    color: theme.palette.mode === 'dark' ? '#569cd6' : '#0000ff',
  },
  [`& .${classes.token}.undefined`]: {
    color: theme.palette.mode === 'dark' ? '#569cd6' : '#0000ff',
  },
  [`& .${classes.token}.function`]: {
    color: theme.palette.mode === 'dark' ? '#569cd6' : '#0000ff',
  },
}));

interface PropertyValueProps {
  open?: boolean;
  type: PropValueType;
  value: unknown;
}

function PropertyValue({ open = false, type, value }: PropertyValueProps) {
  return (
    <span className={clsx(classes.token, getTokenType(type))}>{getLabel(value, type, open)}</span>
  );
}

interface TreeItemIconProps {
  leaf: boolean;
  open: boolean;
}

function TreeItemIcon({ leaf, open }: TreeItemIconProps) {
  if (leaf) {
    return <SvgIcon />;
  }
  return open ? <ArrowDropDownIcon /> : <ArrowRightIcon />;
}

export function ObjectPropertyEntry<T extends ObjectTreePropertyNode = ObjectTreePropertyNode>({
  node,
  style,
  dragHandle,
}: NodeRendererProps<T>) {
  return (
    // TODO: react-arborist sets role treeitem to its parent but suggests onClick on this node
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={classes.node}
      style={{ ...style, userSelect: 'unset' }}
      ref={dragHandle}
      onClick={() => node.toggle()}
    >
      <TreeItemIcon leaf={node.isLeaf} open={node.isOpen} />
      <span>
        {node.data.label ? <span>{node.data.label}: </span> : null}
        <PropertyValue open={node.isOpen} value={node.data.value} type={node.data.type} />
      </span>
    </div>
  );
}

function useDimensions<E extends HTMLElement>(): [
  React.RefCallback<E>,
  { width?: number; height?: number },
] {
  const elmRef = React.useRef<E | null>(null);
  const [dimensions, setDimensions] = React.useState({});

  const observerRef = React.useRef<ResizeObserver | undefined>();
  const getObserver = () => {
    let observer = observerRef.current;
    if (!observer) {
      observer = new ResizeObserver(() => {
        setDimensions(elmRef.current?.getBoundingClientRect().toJSON());
      });
      observerRef.current = observer;
    }
    return observer;
  };

  const ref = React.useCallback((elm: E | null) => {
    elmRef.current = elm;
    setDimensions(elm?.getBoundingClientRect().toJSON());
    const observer = getObserver();
    observer.disconnect();
    if (elm) {
      observer.observe(elm);
    }
  }, []);

  return [ref, dimensions];
}

export interface MuiObjectInspectorProps {
  label?: string;
  data?: unknown;
  expandPaths?: string[];
}

export default function MuiObjectInspector({
  label,
  data = {},
  expandPaths,
}: MuiObjectInspectorProps) {
  const initialOpenState = React.useMemo(
    () => (expandPaths ? Object.fromEntries(expandPaths.map((path) => [path, true])) : {}),
    [expandPaths],
  );

  const treeData: ObjectTreePropertyNode[] = React.useMemo(
    () => createObjectTreeData(data, { label }),
    [data, label],
  );

  const [rootRef, dimensions] = useDimensions<HTMLDivElement>();

  return (
    <div ref={rootRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <Tree
        indent={8}
        disableDrag
        disableDrop
        data={treeData}
        initialOpenState={initialOpenState}
        width={dimensions.width}
        height={dimensions.height}
      >
        {ObjectPropertyEntry}
      </Tree>
    </div>
  );
}
