import pandas as pd
from sklearn.model_selection import train_test_split

CSV = "fish_dataset_multistage.csv"
RANDOM_STATE = 42

df = pd.read_csv(CSV)

# ---------------------------------
# STAGE 1: fish vs non_fish
# ---------------------------------
stage1_df = df.copy()

fish_level_stage1 = stage1_df.groupby("fish_id")["binary_label"].first().reset_index()

ids = fish_level_stage1["fish_id"].values
labels = fish_level_stage1["binary_label"].values

train_ids, temp_ids = train_test_split(
    ids,
    test_size=0.30,
    random_state=RANDOM_STATE,
    shuffle=True,
    stratify=labels
)

temp_labels = fish_level_stage1.set_index("fish_id").loc[temp_ids]["binary_label"].values

val_ids, test_ids = train_test_split(
    temp_ids,
    test_size=0.50,
    random_state=RANDOM_STATE,
    shuffle=True,
    stratify=temp_labels
)

stage1_train = stage1_df[stage1_df["fish_id"].isin(train_ids)].reset_index(drop=True)
stage1_val   = stage1_df[stage1_df["fish_id"].isin(val_ids)].reset_index(drop=True)
stage1_test  = stage1_df[stage1_df["fish_id"].isin(test_ids)].reset_index(drop=True)

stage1_train.to_csv("stage1_train.csv", index=False)
stage1_val.to_csv("stage1_val.csv", index=False)
stage1_test.to_csv("stage1_test.csv", index=False)

print("STAGE 1 DONE")
print("Rows -> Train:", len(stage1_train), "Val:", len(stage1_val), "Test:", len(stage1_test))
print(stage1_train["binary_label"].value_counts())


# ---------------------------------
# STAGE 2: species classification
# only real target fish
# ---------------------------------
stage2_df = df[df["binary_label"] == "fish"].copy()

# Optional: remove rare species with too few samples
species_counts = stage2_df.groupby("species_label")["fish_id"].nunique()
valid_species = species_counts[species_counts >= 3].index
stage2_df = stage2_df[stage2_df["species_label"].isin(valid_species)].reset_index(drop=True)

fish_level_stage2 = stage2_df.groupby("fish_id")["species_label"].first().reset_index()

ids = fish_level_stage2["fish_id"].values
labels = fish_level_stage2["species_label"].values

train_ids, temp_ids = train_test_split(
    ids,
    test_size=0.30,
    random_state=RANDOM_STATE,
    shuffle=True,
    stratify=labels
)

temp_labels = fish_level_stage2.set_index("fish_id").loc[temp_ids]["species_label"].values

val_ids, test_ids = train_test_split(
    temp_ids,
    test_size=0.50,
    random_state=RANDOM_STATE,
    shuffle=True,
    stratify=temp_labels
)

stage2_train = stage2_df[stage2_df["fish_id"].isin(train_ids)].reset_index(drop=True)
stage2_val   = stage2_df[stage2_df["fish_id"].isin(val_ids)].reset_index(drop=True)
stage2_test  = stage2_df[stage2_df["fish_id"].isin(test_ids)].reset_index(drop=True)

stage2_train.to_csv("stage2_species_train.csv", index=False)
stage2_val.to_csv("stage2_species_val.csv", index=False)
stage2_test.to_csv("stage2_species_test.csv", index=False)

print("\nSTAGE 2 DONE")
print("Rows -> Train:", len(stage2_train), "Val:", len(stage2_val), "Test:", len(stage2_test))
print(stage2_train["species_label"].value_counts())


# ---------------------------------
# STAGE 3: grade classification
# only real target fish
# ---------------------------------
stage3_df = df[df["binary_label"] == "fish"].copy()

grade_counts = stage3_df.groupby("grade_label")["fish_id"].nunique()
valid_grades = grade_counts[grade_counts >= 3].index
stage3_df = stage3_df[stage3_df["grade_label"].isin(valid_grades)].reset_index(drop=True)

fish_level_stage3 = stage3_df.groupby("fish_id")["grade_label"].first().reset_index()

ids = fish_level_stage3["fish_id"].values
labels = fish_level_stage3["grade_label"].values

train_ids, temp_ids = train_test_split(
    ids,
    test_size=0.30,
    random_state=RANDOM_STATE,
    shuffle=True,
    stratify=labels
)

temp_labels = fish_level_stage3.set_index("fish_id").loc[temp_ids]["grade_label"].values

val_ids, test_ids = train_test_split(
    temp_ids,
    test_size=0.50,
    random_state=RANDOM_STATE,
    shuffle=True,
    stratify=temp_labels
)

stage3_train = stage3_df[stage3_df["fish_id"].isin(train_ids)].reset_index(drop=True)
stage3_val   = stage3_df[stage3_df["fish_id"].isin(val_ids)].reset_index(drop=True)
stage3_test  = stage3_df[stage3_df["fish_id"].isin(test_ids)].reset_index(drop=True)

stage3_train.to_csv("stage3_grade_train.csv", index=False)
stage3_val.to_csv("stage3_grade_val.csv", index=False)
stage3_test.to_csv("stage3_grade_test.csv", index=False)

print("\nSTAGE 3 DONE")
print("Rows -> Train:", len(stage3_train), "Val:", len(stage3_val), "Test:", len(stage3_test))
print(stage3_train["grade_label"].value_counts())