export const PGN_METADATA = {
  event: 'Hoogovens Group A',
  site: 'Wijk aan Zee NED',
  date: '1999.01.20',
  round: '4',
  white: 'Kasparov, Garry',
  black: 'Topalov, Veselin',
  result: '1-0',
  eco: 'B07',
} as const;

export const PGN_MOVES = `1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7
8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O
14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5
20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4
25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7
30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2
35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3
40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`;

export const FULL_PGN = `[Event "${PGN_METADATA.event}"]
[Site "${PGN_METADATA.site}"]
[Date "${PGN_METADATA.date}"]
[Round "${PGN_METADATA.round}"]
[White "${PGN_METADATA.white}"]
[Black "${PGN_METADATA.black}"]
[Result "${PGN_METADATA.result}"]
[ECO "${PGN_METADATA.eco}"]

${PGN_MOVES}`;
