import { ConnectionLineComponent } from "@xyflow/react";

const CustomConnectionLine: ConnectionLineComponent = ({
  fromX,
  fromY,
  toX,
  toY,
}) => {
  const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI);

  return (
    <g>
      <defs>
        <linearGradient
          id='connection-gradient'
          x1='0%'
          y1='0%'
          x2='100%'
          y2='0%'>
          <stop offset='0%' stopColor='rgba(139, 92, 246, 0.8)' />
          <stop offset='100%' stopColor='rgba(139, 92, 246, 0.2)' />
        </linearGradient>
      </defs>
      <path
        fill='none'
        strokeWidth={2.5}
        stroke='url(#connection-gradient)'
        d={`M${fromX},${fromY} C ${fromX} ${toY} ${fromX} ${toY} ${toX},${toY}`}
      />
      <circle cx={toX} cy={toY} fill='rgba(139, 92, 246, 0.5)' r={8}>
        <animate
          attributeName='r'
          values='8; 12; 8'
          dur='1.5s'
          repeatCount='indefinite'
        />
      </circle>
    </g>
  );
};

export default CustomConnectionLine;
