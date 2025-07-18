export const mapEqmtIds = (data) => {
  const map = {};
  data.forEach((item) => {
    const teams = item.team.split('/').map((t) => t.trim());
    teams.forEach((t) => {
      map[t] = item.eqmtIds;
    });
  });
  return map;
};
