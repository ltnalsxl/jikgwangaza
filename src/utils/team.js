export const getTeamInfo = team => {
  const teamData = {
    KIA: {
      color: '#EA0029',
      text: 'KIA',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HT.png',
      fullName: 'KIA 타이거즈',
      fullNameEn: 'KIA Tigers',
      stadium: '광주 KIA 챔피언스필드'
    },
    HT: {
      color: '#EA0029',
      text: 'KIA',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HT.png',
      fullName: 'KIA 타이거즈',
      fullNameEn: 'KIA Tigers',
      stadium: '광주 KIA 챔피언스필드'
    },
    두산: {
      color: '#131230',
      text: '두산',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_OB.png',
      fullName: '두산 베어스',
      fullNameEn: 'Doosan Bears',
      stadium: '잠실야구장'
    },
    OB: {
      color: '#131230',
      text: '두산',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_OB.png',
      fullName: '두산 베어스',
      fullNameEn: 'Doosan Bears',
      stadium: '잠실야구장'
    },
    LG: {
      color: '#C30452',
      text: 'LG',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_LG.png',
      fullName: 'LG 트윈스',
      fullNameEn: 'LG Twins',
      stadium: '잠실야구장'
    },
    삼성: {
      color: '#074CA1',
      text: '삼성',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_SS.png',
      fullName: '삼성 라이온즈',
      fullNameEn: 'Samsung Lions',
      stadium: '대구 삼성 라이온즈 파크'
    },
    SS: {
      color: '#074CA1',
      text: '삼성',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_SS.png',
      fullName: '삼성 라이온즈',
      fullNameEn: 'Samsung Lions',
      stadium: '대구 삼성 라이온즈 파크'
    },
    롯데: {
      color: '#041E42',
      text: '롯데',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_LT.png',
      fullName: '롯데 자이언츠',
      fullNameEn: 'Lotte Giants',
      stadium: '부산 사직야구장'
    },
    LT: {
      color: '#041E42',
      text: '롯데',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_LT.png',
      fullName: '롯데 자이언츠',
      fullNameEn: 'Lotte Giants',
      stadium: '부산 사직야구장'
    },
    SSG: {
      color: '#CE0E2D',
      text: 'SSG',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_SK.png',
      fullName: 'SSG 랜더스',
      fullNameEn: 'SSG Landers',
      stadium: '인천 SSG 랜더스필드'
    },
    SK: {
      color: '#CE0E2D',
      text: 'SSG',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_SK.png',
      fullName: 'SSG 랜더스',
      fullNameEn: 'SSG Landers',
      stadium: '인천 SSG 랜더스필드'
    },
    키움: {
      color: '#570514',
      text: '키움',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_WO.png',
      fullName: '키움 히어로즈',
      fullNameEn: 'Kiwoom Heroes',
      stadium: '고척 스카이돔'
    },
    WO: {
      color: '#570514',
      text: '키움',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_WO.png',
      fullName: '키움 히어로즈',
      fullNameEn: 'Kiwoom Heroes',
      stadium: '고척 스카이돔'
    },
    한화: {
      color: '#FF6600',
      text: '한화',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HH.png',
      fullName: '한화 이글스',
      fullNameEn: 'Hanwha Eagles',
      stadium: '대전 한화생명 이글스파크'
    },
    HH: {
      color: '#FF6600',
      text: '한화',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_HH.png',
      fullName: '한화 이글스',
      fullNameEn: 'Hanwha Eagles',
      stadium: '대전 한화생명 이글스파크'
    },
    NC: {
      color: '#315288',
      text: 'NC',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_NC.png',
      fullName: 'NC 다이노스',
      fullNameEn: 'NC Dinos',
      stadium: '창원 NC파크'
    },
    KT: {
      color: '#000000',
      text: 'KT',
      logo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed/emblem_KT.png',
      fullName: 'KT 위즈',
      fullNameEn: 'KT Wiz',
      stadium: '수원 KT 위즈파크'
    }
  };
  return (
    teamData[team] || {
      color: '#0ea5e9',
      text: '⚾',
      logo: null,
      fullName: team,
      fullNameEn: team
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
