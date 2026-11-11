// Selection catalog. Photos remain separate from native geometry and its tests.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {libraryCharacters} from './library.mjs';
export const photoCharacters=Object.freeze([
  {
    "shape": "photo_fragrance",
    "name": "香氛街区",
    "key": "fragrance",
    "number": "32",
    "kind": "photo",
    "file": "fragrance.png",
    "sha256": "11e0c40540bfb9595366c973924a63a8bf360cae8143098de18243e97a3b2c0f"
  },
  {
    "shape": "photo_lotus",
    "name": "江南贵女",
    "key": "lotus",
    "number": "33",
    "kind": "photo",
    "file": "lotus.png",
    "sha256": "a2b5d0e44158edc5f7d70ce5df69407466f982acda37d2c8b68a2cc9ff2bfa17"
  },
  {
    "shape": "photo_designweek",
    "name": "设计周广场",
    "key": "designweek",
    "number": "34",
    "kind": "photo",
    "file": "designweek.png",
    "sha256": "4a36528fdbb1d4af3c0c7eddd5b06cffb989a120ff245fcffdff5830ad9174b1"
  },
  {
    "shape": "photo_metro",
    "name": "地铁广场",
    "key": "metro",
    "number": "35",
    "kind": "photo",
    "file": "metro.png",
    "sha256": "ad830cac7b4c1c27a8f2d856fbab4cb42859bfeab42298f6471a82cac043e62d"
  },
  {
    "shape": "photo_skywalk",
    "name": "空中连廊",
    "key": "skywalk",
    "number": "36",
    "kind": "photo",
    "file": "skywalk.png",
    "sha256": "b438795eec068833f5144bc166e21937ea618b14e684eed36654db03d6f454fb"
  },
  {
    "shape": "photo_park",
    "name": "公园日常",
    "key": "park",
    "number": "37",
    "kind": "photo",
    "file": "park.png",
    "sha256": "8b1d11f9934c7fdf84cff2adc8a4e4a10f8a69457fc834d531080fae07816514"
  },
  {
    "shape": "photo_citynight",
    "name": "城市夜色",
    "key": "citynight",
    "number": "38",
    "kind": "photo",
    "file": "citynight.png",
    "sha256": "2b83c48257bf5ad0b88eaa62f39c5eca2b0d5b548edc764a3a7ee8451447e4c5"
  },
  {
    "shape": "photo_flowerfield",
    "name": "山野花田",
    "key": "flowerfield",
    "number": "39",
    "kind": "photo",
    "file": "flowerfield.png",
    "sha256": "95aafa8163959300fb6cd4f40544ad1810190d4a23e0aeaaa240fee7e0f6e13b"
  },
  {
    "shape": "photo_sunnybeach",
    "name": "海滩晴蓝",
    "key": "sunnybeach",
    "number": "40",
    "kind": "photo",
    "file": "sunnybeach.png",
    "sha256": "88475a9716298ef76a1059967c65a4f56301515daf98ffaa1385e5685b250333"
  },
  {
    "shape": "photo_seabreeze",
    "name": "海风白裙",
    "key": "seabreeze",
    "number": "41",
    "kind": "photo",
    "file": "seabreeze.png",
    "sha256": "2b1239e18a32c939a4eeb0fcedb98fef971bdd95574bc01dc04af5dc78741835"
  },
  {
    "shape": "photo_lakecafe",
    "name": "湖畔咖啡",
    "key": "lakecafe",
    "number": "42",
    "kind": "photo",
    "file": "lakecafe.png",
    "sha256": "de2b5a2009ea054e6fd777eacc6ec10da0b196e8f5d322203bf93cb085162501"
  }
]);
export const avatarChoices=Object.freeze([...libraryCharacters.map(c=>({...c,kind:'native'})),...photoCharacters]);
export const avatarChoice=shape=>avatarChoices.find(c=>c.shape===shape);
export const photoCharacter=shape=>photoCharacters.find(c=>c.shape===shape);
export function photoDataUrls(){
  return Object.fromEntries(photoCharacters.map(c=>{
    const bytes=readFileSync(new URL('./photos/'+c.file,import.meta.url));
    if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==256||bytes.readUInt32BE(20)!==256||createHash('sha256').update(bytes).digest('hex')!==c.sha256)throw Error('Photo asset differs from verified crop: '+c.file);
    return [c.shape,'data:image/png;base64,'+bytes.toString('base64')];
  }));
}
