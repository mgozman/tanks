function compression (str){
    let result = '';
    let letter = str.charAt(0);
    let count = 0;
    for (let i = 1; i < str.length; i++){
        if (letter == str.charAt(i)){
            count++;
        } else {
            result += letter + count;
            count = 0;
            letter = str.charAt(i);
        }
    }
    if (str.length < result.length){
        return str;
    } else {
        return result
    }
}

console.log(compression("aabcccccaaa"));