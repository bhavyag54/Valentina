import React, { useContext, useEffect, useLayoutEffect, useState } from "react";
import Header from "../components/Header/Header";
import Post from "../components/Post/Post";
import {
  Alert,
  Dimensions,
  FlatList,
  StatusBar,
  Text,
  View,
} from "react-native";
import AppContext from "../context/AppContext";

import useAuth from "../hooks/useAuth";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
} from "@firebase/firestore";
import { db } from "../firebase";
import Skeleton from "../components/Skeleton/Skeleton";
import NoMoreProfile from "./LikeScreen/NoMoreProfile";
import MatchModal from "../components/Notifications/MatchModal";

const HomeScreen = () => {
  let navigation = useNavigation();
  let { user } = useAuth();
  let {
    headerState,
    HorizontalScrollViewRef,
    SetScrollViewRef,
    SetHeaderState,
    totalProfiles,
    setTotalProfiles,
  } = useContext(AppContext);
  let style = headerState ? "dark-content" : "light-content";
  StatusBar.setBarStyle(style, true);
  const [Profiles, setProfiles] = useState([]);
  const [Loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [matchNotif, setMatchNotif] = useState(false);

  let handleVerticalScroll = (e) => {
    SetHeaderState(0);
    // console.log(HorizontalScrollViewRef)
    // HorizontalScrollViewRef.current.scrollTo({x:0,animated:true})
  };
  useLayoutEffect(
    () =>
      onSnapshot(doc(db, "users", user.uid), (snapshot) => {
        if (!snapshot.exists()) {
          navigation.navigate("What's in the name tho?");
        } else {
          let dob = snapshot.get("dob");
          if (!dob) {
            navigation.navigate("Are You Old Enough?");
          } else {
            let gender = snapshot.get("gender");
            if (!gender) {
              navigation.navigate("Gender");
            } else {
              let sexuality = snapshot
                .get("aboutStuff")
                .filter((about) => about.type === "sexuality");
              if (sexuality.length !== 0) {
                if (!sexuality[0]["value"]) {
                  navigation.navigate("Sexuality");
                } else {
                  let lookingFor = snapshot
                    .get("aboutStuff")
                    .filter((about) => about.type === "looking_for");
                  if (lookingFor.length !== 0) {
                    if (!lookingFor[0]["value"]) {
                      navigation.navigate("Gender Interest");
                    } else {
                      let batch = snapshot
                        .get("aboutStuff")
                        .filter((about) => about.type === "batch");
                      if (batch.length !== 0) {
                        if (!batch[0]["value"]) {
                          navigation.navigate("Batch");
                        } else {
                          let bio = snapshot.get("bio");
                          if (!bio) {
                            navigation.navigate("Bio");
                          } else {
                            let interest = snapshot.get("interest");
                            if (
                              interest.main.length === 0 &&
                              interest.new.length === 0
                            ) {
                              navigation.navigate("Interests");
                            } else {
                              let image = snapshot.get("image");
                              if (image) {
                                if (
                                  image["profile_1"] === "null" ||
                                  image["profile_2"] === "null" ||
                                  image["profile_1"] === "" ||
                                  image["profile_2"] === ""
                                ) {
                                  navigation.navigate("Photo");
                                }
                              }
                            }
                          }
                        }
                      } else {
                        navigation.navigate("Batch");
                      }
                    }
                  } else {
                    navigation.navigate("Gender Interest");
                  }
                }
              } else {
                navigation.navigate("Sexuality");
              }
            }
          }
        }
      }),
    []
  );
  // useLayoutEffect()
  useEffect(
    //code to fetch matches from firebase
    () =>
      onSnapshot(
        query(
          collection(db, "matches"),
          where("usersMatched", "array-contains", user.uid)
        ),
        (snapshot) => {
          setMatches(
            snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
          );
          console.log(matches);
          if (matches.length > 0) {
            let newMatches = matches.filter(
              (match) => match.isNewFor === user.uid
            );
            // console.log(newMatches)
            if (newMatches.length !== 0) {
              Alert.alert(
                "You Have Matches",
                `Head Over to Match Screen to See them`,
                [{ text: "OK", onPress: () => console.log("OK Pressed") }]
              );
              newMatches.forEach((match) => {
                let data = { isNewFor: "" };
                updateDoc(doc(db, "matches", match.id), {
                  ...data,
                });
              });
            }
          }
        }
      ),

    [user]
  );
  useLayoutEffect(() => {
    let unsub;
    let dislikes = [];
    const fetchData = async () => {
      const dislikesSnapshot = await getDocs(
        collection(db, "users", user.uid, "dislikes")
      );
      dislikesSnapshot.forEach((doc) => {
        let id = doc.id;
        dislikes.push(id);
      });
      let dislikesUserIds = dislikes.length > 0 ? dislikes : ["test"];
      //console.log(Profiles.forEach((profile) => console.log(profile.id)));
      const userDetails = await getDoc(doc(db, "users", user.uid));
      // const getAboutStuff = await userDetails.get("aboutStuff")
      // const getPreference =  await getAboutStuff[0]["value"]
      const getPreference = userDetails
        .get("aboutStuff")
        .filter((about) => about.type === "looking_for")[0]["value"];
      console.log(getPreference);
      let q;
      if (getPreference == "both") {
        q = query(
          collection(db, "users"),
          where("id", "not-in", [...dislikesUserIds])
        );
      } else {
        q = query(
          collection(db, "users"),
          where("id", "not-in", [...dislikesUserIds]),
          where("gender", "==", getPreference)
        );
      }
      unsub = onSnapshot(q, (snapshot) => {
        setProfiles(
          snapshot.docs
            .filter((doc) => doc.id !== user.uid)
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
        );
        setLoading(false);
        setTotalProfiles(Profiles.length);
      });
    };

    fetchData();
    // console.log(Profiles);
    return unsub;
  }, []);
  useLayoutEffect(() => {
    if (Profiles.length === 0) {
      SetHeaderState(1);
    } else {
      SetHeaderState(0);
    }
  }, [Profiles]);

  return (
    <View>
      <Header />
      {!Loading ? (
        Profiles.length !== 0 ? (
          <>
            <FlatList
              data={Profiles}
              renderItem={({ item }) => (
                <Post
                  keyExtractor={(item) => item.id.toString()}
                  profUser={item}
                  TotalProfiles={Profiles.length}
                />
              )}
              showsVerticalScrollIndicator={false}
              snapToInterval={Dimensions.get("screen").height}
              snapToAlignment={"start"}
              decelerationRate={"fast"}
              ref={(ref) => {
                SetScrollViewRef(ref);
              }}
              alwaysBounceHorizontal={false}
              alwaysBounceVertical={true}
              bounces={true}
              onScroll={handleVerticalScroll}
              extraData={Profiles}
            />
          </>
        ) : (
          <>
            <NoMoreProfile />
          </>
        )
      ) : (
        <>
          <Skeleton />
        </>
      )}
    </View>
  );
};

export default HomeScreen;
