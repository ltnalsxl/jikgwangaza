export const getTeamInfo = team => {
  const teamData = {
    KIA: {
      color: '#EA0029',
      text: 'KIA',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HT.png',
      fullName: 'KIA 타이거즈'
    },
    HT: {
      color: '#EA0029',
      text: 'KIA',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HT.png',
      fullName: 'KIA 타이거즈'
    },
    두산: {
      color: '#131230',
      text: '두산',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_OB.png',
      fullName: '두산 베어스'
    },
    OB: {
      color: '#131230',
      text: '두산',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_OB.png',
      fullName: '두산 베어스'
    },
    LG: {
      color: '#C30452',
      text: 'LG',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_LG.png',
      fullName: 'LG 트윈스'
    },
    삼성: {
      color: '#074CA1',
      text: '삼성',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_SS.png',
      fullName: '삼성 라이온즈'
    },
    SS: {
      color: '#074CA1',
      text: '삼성',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_SS.png',
      fullName: '삼성 라이온즈'
    },
    롯데: {
      color: '#041E42',
      text: '롯데',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_LT.png',
      fullName: '롯데 자이언츠'
    },
    LT: {
      color: '#041E42',
      text: '롯데',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_LT.png',
      fullName: '롯데 자이언츠'
    },
    SSG: {
      color: '#CE0E2D',
      text: 'SSG',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_SK.png',
      fullName: 'SSG 랜더스'
    },
    SK: {
      color: '#CE0E2D',
      text: 'SSG',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_SK.png',
      fullName: 'SSG 랜더스'
    },
    키움: {
      color: '#570514',
      text: '키움',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_WO.png',
      fullName: '키움 히어로즈'
    },
    WO: {
      color: '#570514',
      text: '키움',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_WO.png',
      fullName: '키움 히어로즈'
    },
    한화: {
      color: '#FF6600',
      text: '한화',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HH.png',
      fullName: '한화 이글스'
    },
    HH: {
      color: '#FF6600',
      text: '한화',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HH.png',
      fullName: '한화 이글스'
    },
    NC: {
      color: '#315288',
      text: 'NC',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_NC.png',
      fullName: 'NC 다이노스'
    },
    KT: {
      color: '#000000',
      text: 'KT',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_KT.png',
      fullName: 'KT 위즈'
    }
  };
  return (
    teamData[team] || {
      color: '#0ea5e9',
      text: '⚾',
      logo: null,
      fullName: team
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
