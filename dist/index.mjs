// index.ts
function add(...nums) {
  return nums.reduce((acc, num) => acc + num, 0);
}
console.log(add(1, -1, 2, 18, -20));
export {
  add
};
