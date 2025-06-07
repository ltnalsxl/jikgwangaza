export const getTeamInfo = team => {
  const teamData = {
    KIA: {
      color: '#EA0029',
      text: 'KIA',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HT.png'
    },
    두산: {
      color: '#131230',
      text: '두산',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_OB.png'
    },
    LG: {
      color: '#C30452',
      text: 'LG',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_LG.png'
    },
    삼성: {
      color: '#074CA1',
      text: '삼성',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_SS.png'
    },
    롯데: {
      color: '#041E42',
      text: '롯데',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_LT.png'
    },
    SSG: {
      color: '#CE0E2D',
      text: 'SSG',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_SK.png'
    },
    키움: {
      color: '#570514',
      text: '키움',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_WO.png'
    },
    한화: {
      color: '#FF6600',
      text: '한화',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HH.png'
    },
    NC: {
      color: '#315288',
      text: 'NC',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_NC.png'
    },
    KT: {
      color: '#000000',
      text: 'KT',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_KT.png'
    }
  };
  return (
    teamData[team] || {
      color: '#0ea5e9',
      text: '⚾',
      logo: null
    }
  );
};

export const getPositionKorean = position => {
  const positionMap = {
    P: '투수',
    C: '포수',
    '1B': '1루수',
    '2B': '2루수',
    '3B': '3루수',
    SS: '유격수',
    LF: '좌익수',
    CF: '중견수',
    RF: '우익수',
    DH: '지명타자',
    PH: '대타',
    PR: '대주자'
  };
  return positionMap[position] || position;
};

export const getBattingOrder = (order, position) => {
  if (position === 'P') return '';
  return `${order}번타자`;
};
